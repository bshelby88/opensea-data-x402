// A2A agent card (free, unauthenticated, static metadata).
// Pure function: no I/O, no secrets. Price/network come from paywall.js constants
// so the card cannot drift from the paid route; payTo and challenge terms are NOT
// restated here - the x402 manifest and the live 402 challenge are authoritative.
export function buildAgentCard({ baseUrl, price, network }) {
    const base = baseUrl.replace(/\/$/, "");
    return {
        name: "OpenSea Collection Data (RAEN x402)",
        description: `Query OpenSea collection data (floor price, listings, offers, traits) for any NFT collection slug for ${price} USDC on ${network}: POST /api { collection, action } where action is one of floor | listings | offers | traits. Pay per call via x402 - no API keys, no subscription. Free surfaces: GET /sample, GET /openapi.json, GET /health, GET /.well-known/x402.json, GET /.well-known/ai-tool/opensea-collection-data.json.`,
        version: "1.0.0",
        protocolVersion: "1.0",
        url: base,
        supportedInterfaces: [{ url: base, transport: "HTTP+JSON", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" }],
        preferredTransport: "HTTP+JSON",
        provider: { organization: "Royal Agentic Enterprises", url: base },
        documentationUrl: base + "/openapi.json",
        capabilities: {
            streaming: false,
            pushNotifications: false,
            stateTransitionHistory: false,
            extensions: [{
                uri: "https://x402.org",
                description: `x402 v2 payment gating: USDC on ${network}, scheme exact, ${price} per call. Payment terms (price, payTo, facilitator) are published in ${base}/.well-known/x402.json. The live 402 challenge is authoritative.`,
                required: false,
            }],
        },
        defaultInputModes: ["application/json"],
        defaultOutputModes: ["application/json"],
        skills: [{
            id: "opensea-collection-data",
            name: "OpenSea collection data (paid)",
            description: `POST /api - ${price} USDC on ${network} via x402. Body { collection, action } with action in floor | listings | offers | traits; returns structured collection data as JSON. Unpaid requests (any method) return HTTP 402 with the x402 challenge (PAYMENT-REQUIRED header).`,
            tags: ["nft", "opensea", "floor-price", "listings", "offers", "traits", "x402", "usdc"],
            examples: ["What is the current floor price of boredapeyachtclub on OpenSea?"],
        }],
        securitySchemes: {},
        security: [],
    };
}
