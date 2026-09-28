import { createToolHandler, ToolHandlerError } from "@opensea/tool-sdk";
import { z } from "zod/v4";
import { manifest } from "./manifest.js";
const InputSchema = z.object({
    collection: z.string().min(1),
    action: z.enum(["floor", "listings", "offers", "traits"]),
});
const OutputSchema = z.object({
    collection: z.string(),
    action: z.string(),
    data: z.unknown(),
});
async function fetchOpenSea(path) {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
        throw new ToolHandlerError(503, "OPENSEA_API_KEY environment variable is not set");
    }
    const res = await fetch(`https://api.opensea.io${path}`, {
        headers: {
            "X-API-KEY": apiKey,
            "Accept": "application/json",
        },
    });
    if (res.status === 429) {
        throw new ToolHandlerError(429, "OpenSea API rate limit reached — retry shortly");
    }
    if (res.status === 404) {
        throw new ToolHandlerError(404, "Not found: unknown collection slug");
    }
    if (res.status === 401 || res.status === 403) {
        throw new ToolHandlerError(res.status, "OpenSea API rejected the server-side API key — contact tool operator");
    }
    if (!res.ok) {
        const body = await res.text();
        throw new ToolHandlerError(502, `OpenSea API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
}
export const toolHandler = createToolHandler({
    manifest,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    // Payment enforcement lives in server.ts via @x402/express v2 middleware
    // (x402scan requires v2 challenges; the SDK's payai gate emits v1 only).
    handler: async (input) => {
        const { collection, action } = input;
        let data;
        switch (action) {
            case "floor": {
                data = await fetchOpenSea(`/api/v2/collections/${collection}/stats`);
                break;
            }
            case "listings": {
                data = await fetchOpenSea(`/api/v2/listings/collection/${collection}/all?limit=10`);
                break;
            }
            case "offers": {
                data = await fetchOpenSea(`/api/v2/offers/collection/${collection}/all?limit=10`);
                break;
            }
            case "traits": {
                data = await fetchOpenSea(`/api/v2/traits/${collection}`);
                break;
            }
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        return { collection, action, data };
    },
});
