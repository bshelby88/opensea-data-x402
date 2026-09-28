// Wallet provider auto-detection for RAE OpenSea tooling.
//
// IMPORTANT (the "import path issue"): do NOT import `@opensea/wallet-adapters`
// directly from this package. It is only present via the parent workspace
// node_modules on this host; it is not a declared dependency of this tool, so
// a direct import resolves locally but FAILS inside the Docker build (the
// image's `npm install` only installs declared deps). `@opensea/tool-sdk`
// re-exports the wallet surface (createWalletFromEnv, createWalletForProvider,
// walletAdapterToClient, WALLET_PROVIDERS, and each provider adapter class) —
// importing through the SDK is the stable path, guaranteed wherever the SDK
// installs. (`detectProvider` is NOT re-exported by the SDK, so the exact
// rules of @opensea/wallet-adapters v1.2.1 `detectEvmProvider()` are mirrored
// below; both were run side-by-side on this host 2026-09-17 (Tiffany) and the
// cross-check in test/test-wallet.ts proves the mirror is exact.)
//
// Auto-detect priority (RAE fleet spec, confirmed against installed lib):
//   Privy > Fireblocks > Turnkey > Bankr > PrivateKey
// Detection keys (subset of full provider config; the adapter constructor
// validates the rest at use time):
//   privy:       PRIVY_APP_ID + PRIVY_WALLET_ID
//   fireblocks:  FIREBLOCKS_API_KEY + FIREBLOCKS_VAULT_ID
//   turnkey:     TURNKEY_API_PUBLIC_KEY + TURNKEY_WALLET_ADDRESS
//   bankr:       BANKR_API_KEY
//   private-key: PRIVATE_KEY
import { createWalletFromEnv, createWalletForProvider, walletAdapterToClient, WALLET_PROVIDERS, } from "@opensea/tool-sdk";
/** Detection key pairs mirroring @opensea/wallet-adapters v1.2.1 detectEvmProvider(), in priority order. */
export const PROVIDER_DETECTION = [
    ["privy", ["PRIVY_APP_ID", "PRIVY_WALLET_ID"]],
    ["fireblocks", ["FIREBLOCKS_API_KEY", "FIREBLOCKS_VAULT_ID"]],
    ["turnkey", ["TURNKEY_API_PUBLIC_KEY", "TURNKEY_WALLET_ADDRESS"]],
    ["bankr", ["BANKR_API_KEY"]],
    ["private-key", ["PRIVATE_KEY"]],
];
/** Full env vars each provider needs to *operate* (opensea-wallet skill; Turnkey also wants API pub/priv keys + org id; Fireblocks wants API secret). */
export const PROVIDER_ENV = {
    privy: ["PRIVY_APP_ID", "PRIVY_APP_SECRET", "PRIVY_WALLET_ID"],
    fireblocks: ["FIREBLOCKS_API_KEY", "FIREBLOCKS_API_SECRET", "FIREBLOCKS_VAULT_ID"],
    turnkey: ["TURNKEY_API_PUBLIC_KEY", "TURNKEY_API_PRIVATE_KEY", "TURNKEY_ORGANIZATION_ID", "TURNKEY_WALLET_ADDRESS"],
    bankr: ["BANKR_API_KEY"],
    "private-key": ["PRIVATE_KEY"],
};
/**
 * Exact mirror of @opensea/wallet-adapters detectProvider() (EVM branch):
 * first provider whose detection keys are all present, in RAE spec priority
 * Privy > Fireblocks > Turnkey > Bankr > PrivateKey.
 */
export function detectWalletProvider(env = process.env) {
    for (const [name, keys] of PROVIDER_DETECTION) {
        if (keys.every((k) => Boolean(env[k])))
            return name;
    }
    return null;
}
/** Which providers are FULLY configurable from the given environment (no secret values read). */
export function availableProviders(env = process.env) {
    return Object.keys(PROVIDER_ENV).filter((p) => PROVIDER_ENV[p].every((v) => Boolean(env[v])));
}
/**
 * Resolve a wallet adapter from environment, respecting an explicit
 * RAE_WALLET_PROVIDER override (privy|fireblocks|turnkey|bankr|private-key).
 * Returns null (never throws on "unset") when nothing is configured, so
 * read-only callers can proceed unsigned.
 */
export async function resolveWalletAdapter(env = process.env) {
    const forced = env.RAE_WALLET_PROVIDER;
    const provider = forced ?? detectWalletProvider(env);
    if (!provider)
        return null;
    const adapter = forced
        ? createWalletForProvider(forced)
        : createWalletFromEnv();
    return { provider, adapter };
}
/** viem wallet client for onchain calls (register/pay/auth), or null when unsigned. */
export async function walletClientForChain(chain) {
    const resolved = await resolveWalletAdapter();
    if (!resolved)
        return null;
    return walletAdapterToClient(resolved.adapter, chain);
}
export { createWalletFromEnv, createWalletForProvider, walletAdapterToClient, WALLET_PROVIDERS };
