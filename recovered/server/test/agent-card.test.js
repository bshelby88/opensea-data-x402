import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgentCard } from "../src/agent-card.js";

test("agent card has required A2A fields and describes the paid route", () => {
    const card = buildAgentCard({ baseUrl: "https://opensea-data-x402.fly.dev/", price: "$0.01", network: "eip155:8453" });
    for (const k of ["name", "description", "version", "url", "skills", "capabilities", "defaultInputModes", "defaultOutputModes"]) {
        assert.ok(card[k], `missing ${k}`);
    }
    assert.equal(card.url, "https://opensea-data-x402.fly.dev");
    assert.equal(card.skills.length, 1);
    assert.match(card.skills[0].description, /POST \/api - \$0\.01 USDC on eip155:8453/);
    assert.match(card.capabilities.extensions[0].description, /\.well-known\/x402\.json/);
});

test("agent card makes no payTo claim (manifest/challenge are authoritative)", () => {
    const card = buildAgentCard({ baseUrl: "https://x.example", price: "$0.01", network: "eip155:8453" });
    assert.doesNotMatch(JSON.stringify(card), /0x[a-fA-F0-9]{40}/);
});
