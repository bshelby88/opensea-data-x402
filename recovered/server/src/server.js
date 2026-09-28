import { createWellKnownHandler, toExpressHandler } from "@opensea/tool-sdk";
import express from "express";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { toolHandler } from "./handler.js";
import { manifest } from "./manifest.js";
import { FACILITATOR_URL, NETWORK, PAY_TO, PRICE } from "./paywall.js";
const app = express();
app.set("trust proxy", true); // Fly terminates TLS — emit https resource URL in challenges
app.use(express.json());
// Landing page + llms.txt (static, unpaid) — served from public/ so corrected
// copy is visible to crawlers/agents (2026-09-17 stale-copy fix).
app.use(express.static("public", { index: "index.html" }));
// CORS: expose x402 headers both directions (v1 + v2 headers).
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Payment, PAYMENT-SIGNATURE, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, X-Payment, PAYMENT-SIGNATURE, PAYMENT-RESPONSE, Cache-Control");
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});
// --- x402 v2 payment gate (shipped fleet pattern: escrow a782277, power-pack 36ee216) ---
// Challenge ADVERTISES the AgentPay facilitator (free /verify for any buyer),
// but SERVER-SIDE settlement runs through the Coinbase CDP facilitator —
// AgentPay's /settle only serves resources paying AgentPay's own treasury
// (errorReason PAYEE_NOT_SERVED_HERE, 2026-09-18). Same split as escrow-x402.
const CDP_KEY_NAME = process.env.CDP_API_KEY_NAME || process.env.CDP_API_KEY_ID;
const CDP_KEY_PRIVATE = process.env["CDP_API_KEY_PRIVATE_KEY"] || process.env.CDP_API_KEY_SECRET;
const facilitatorClient = CDP_KEY_NAME && CDP_KEY_PRIVATE
    ? new HTTPFacilitatorClient(createFacilitatorConfig(CDP_KEY_NAME, CDP_KEY_PRIVATE.replace(/\\n/g, "\n")))
    : new HTTPFacilitatorClient({ url: FACILITATOR_URL });
if (CDP_KEY_NAME && CDP_KEY_PRIVATE)
    console.log("→ settling via Coinbase CDP facilitator (Base mainnet)");
const x402Server = new x402ResourceServer(facilitatorClient);
x402Server.register(NETWORK, new ExactEvmScheme());
(async () => {
    for (let i = 1; i <= 12; i++) {
        try {
            await x402Server.initialize();
            console.log(`→ x402 facilitator ready (attempt ${i})`);
            break;
        }
        catch (e) {
            console.error(`x402 facilitator init attempt ${i} failed:`, e);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
})();
const wellKnownHandler = createWellKnownHandler(manifest);
// Bazaar discovery extension (fleet pattern: lingua index.js mkRoute + 9/15
// v2-core migration) — without it, bazaar validate_endpoint rejects the
// challenge ("no bazaar discovery extension found") and the tool stays
// unindexed on Coinbase Bazaar.
// NOTE: the .d.ts omits `method` from the input type but the runtime accepts
// it and bazaar's required checks want info.input.method — assertion keeps the
// runtime-correct shape while satisfying tsc.
const bazaarExtension = declareDiscoveryExtension({
    method: "POST",
    bodyType: "json",
    input: { collection: "boredapeyachtclub", action: "floor" },
    inputSchema: manifest.inputs,
});
// x402 v2.0.0 discovery document for indexers (x402scan via agentcash).
const x402Discovery = {
    version: "2.0.0",
    service: {
        name: "opensea-collection-data",
        description: "Query OpenSea collection data: floor price, listings, offers, and traits for any NFT collection.",
        contact: "jadedfocus@gmail.com",
        operator: "Royal Agentic Enterprises",
    },
    endpoints: {
        "/api": {
            method: "POST",
            accepts: {
                scheme: "exact",
                price: PRICE,
                network: NETWORK,
                payTo: PAY_TO,
                extra: {
                    facilitator: FACILITATOR_URL,
                },
            },
            description: "OpenSea collection data: floor, listings, offers/traits for any slug.",
            mimeType: "application/json",
            extensions: { ...bazaarExtension },
        },
    },
};
const openapiSpec = {
    openapi: "3.1.0",
    info: {
        title: "OpenSea Collection Data",
        description: "Query OpenSea collection data: floor price, listings, offers, and traits for any NFT collection. Pay-per-call via x402 ($0.01 USDC on Base).",
        version: "1.0.0",
        contact: { email: "jadedfocus@gmail.com" },
    },
    servers: [{ url: "https://opensea-data-x402.fly.dev" }],
    paths: {
        "/api": {
            post: {
                summary: "Fetch OpenSea collection data",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    collection: { type: "string", description: "Collection slug (e.g. 'boredapeyachtclub', 'cryptopunks')" },
                                    action: { type: "string", enum: ["floor", "listings", "offers", "traits"], description: "Data to retrieve" },
                                },
                                required: ["collection", "action"],
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Collection data", content: { "application/json": { schema: { type: "object" } } } },
                    "402": { description: "x402 payment required ($0.01 USDC on Base)" },
                },
            },
        },
    },
};
// Payment middleware on the paid route only. The 402 challenge is emitted in the
// x402 v2 wire format (PAYMENT-REQUIRED header). Settlement happens after the
// handler succeeds (verify → run → settle).
app.use(paymentMiddleware({
    "POST /api": {
        accepts: {
            scheme: "exact",
            price: PRICE,
            network: NETWORK,
            payTo: PAY_TO,
            extra: { facilitator: FACILITATOR_URL },
        },
        serviceName: "opensea-collection-data",
        description: "OpenSea collection data: floor, listings, offers, traits for any slug.",
        extensions: { ...bazaarExtension },
    },
}, x402Server, undefined, undefined, false));
// The SDK's toExpressHandler is typed against its own structural ExpressRequest/
// ExpressResponse interfaces; cast to RequestHandler for express 5's own types.
// The SDK paywall gate stays mounted in the handler as defense-in-depth (it only
// triggers if the outer x402 v2 middleware is ever removed).
app.post("/api", toExpressHandler(toolHandler));
app.get("/.well-known/ai-tool/:slug", toExpressHandler(wellKnownHandler));
app.get("/.well-known/x402.json", (_req, res) => {
    res.json(x402Discovery);
});
app.get("/openapi.json", (_req, res) => {
    res.json(openapiSpec);
});
app.get("/health", (_req, res) => {
    res.json({ ok: true, tool: manifest.name });
});
// GET /sample — machine-readable free sample (RAEN A2A charter surface):
// one real OpenSea call, paid by the service, so buyers get live evidence pre-purchase.
app.get("/sample", async (_req, res) => {
    try {
        const r = await fetch("https://api.opensea.io/api/v2/collections/boredapeyachtclub/stats", {
            headers: { "x-api-key": process.env.OPENSEA_API_KEY || "", "User-Agent": "opensea-data-x402/1.0" },
        });
        const stats = await r.json();
        res.json({
            tool: manifest.name,
            note: "Free sample. Paid calls: POST /api with x402 payment. See /pricing.md and /.well-known/ai-tool/opensea-collection-data.json",
            example_request: { method: "POST", url: "https://opensea-data-x402.fly.dev/api", body: { collection: "boredapeyachtclub", action: "floor" } },
            live_result: { collection: "boredapeyachtclub", action: "floor", data: stats },
        });
    }
    catch (e) {
        res.status(502).json({ error: String(e?.message || e) });
    }
});
const port = process.env.PORT ?? 3000;
app.listen(port, () => {
    console.log(`Tool server running on port ${port}`);
});
