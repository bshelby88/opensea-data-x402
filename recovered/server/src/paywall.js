import { defineToolPaywall } from "@opensea/tool-sdk";
// Single source of truth for the price/recipient advertised in the ERC-8257
// manifest and enforced by the x402 v2 middleware in server.ts.
export const PAY_TO = "0x7861db4efc14a1ed5dd8c96c528a3796560f1393";
export const AMOUNT_USDC = "0.01";
export const PRICE = `$${AMOUNT_USDC}`;
// AgentPay facilitator: free, open verification for Base-mainnet x402 sellers
// (2026-09-12 email). Shipped fleet pattern (escrow a782277, power-pack 36ee216,
// royal-ruby b23de44, briefsnap 7c19140). x402.org/facilitator has no
// eip155:8453 exact kind (probed 2026-09-15).
export const NETWORK = "eip155:8453";
export const FACILITATOR_URL = "https://raen-facilitator.fly.dev/facilitator";
export const SERVICE_NAME = "opensea-collection-data";
// Used for manifest.pricing only (USDC-on-Base x402 pricing entry). Runtime
// enforcement is the @x402/express v2 middleware in server.ts (x402scan
// rejects v1-only challenges; the SDK's payai gate emits v1 only).
export const paywall = defineToolPaywall({
    recipient: PAY_TO,
    amountUsdc: AMOUNT_USDC,
    network: "base",
    facilitator: "payai",
    description: "Query OpenSea collection data (floor, listings, offers, traits)",
});
