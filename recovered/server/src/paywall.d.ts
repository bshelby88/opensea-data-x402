export declare const PAY_TO = "0x7861db4efc14a1ed5dd8c96c528a3796560f1393";
export declare const AMOUNT_USDC = "0.01";
export declare const PRICE = "$0.01";
export declare const NETWORK = "eip155:8453";
export declare const FACILITATOR_URL = "https://x402-agent-pay.com/facilitator";
export declare const SERVICE_NAME = "opensea-collection-data";
export declare const paywall: {
    pricing: import("@opensea/tool-sdk").EnvResolver<import("@opensea/tool-sdk").PricingEntry[]>;
    gate: import("@opensea/tool-sdk").GateMiddleware;
};
