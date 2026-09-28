import { defineManifest } from "@opensea/tool-sdk";
import { paywall } from "./paywall.js";
export const manifest = defineManifest({
    type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
    name: "OpenSea Collection Data",
    description: "Query OpenSea collection data: floor price, listings, offers, and traits for any NFT collection.",
    endpoint: "https://opensea-data-x402.fly.dev/api",
    pricing: paywall.pricing,
    inputs: {
        type: "object",
        properties: {
            collection: { type: "string", description: "Collection slug (e.g. 'boredapeyachtclub', 'cryptopunks')" },
            action: { type: "string", enum: ["floor", "listings", "offers", "traits"], description: "Data to retrieve" },
        },
        required: ["collection", "action"],
    },
    outputs: {
        type: "object",
        properties: {
            collection: { type: "string" },
            action: { type: "string" },
            data: { type: "object" },
        },
    },
    creatorAddress: "0xfbc0eb7811d477e55261d956df39f0046e192240",
});
