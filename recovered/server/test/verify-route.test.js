import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// STRAT-103 domain verify: the served hash must equal the CURRENT 402index
// claim hash (SHA-256 of the claim token). Asserted here so a claim rotation
// without a code change fails CI instead of silently breaking verification.
const EXPECTED_HASH =
    process.env.X402INDEX_VERIFY_HASH ||
    "3223e7936cc47829b4e816bcc8bac1b845a26337e740984d0e76526eaff3ab84";
const PORT = 3199;

test("GET /.well-known/402index-verify.txt serves the claim hash (200, text/plain, <1KB)", async () => {
    const src = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "src",
        "server.js"
    );
    const child = spawn(process.execPath, [src], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: "ignore",
    });
    try {
        let booted = false;
        for (let i = 0; i < 40; i++) {
            try {
                const r = await fetch(`http://127.0.0.1:${PORT}/health`);
                if (r.ok) {
                    booted = true;
                    break;
                }
            } catch {}
            await new Promise((res) => setTimeout(res, 500));
        }
        assert.ok(booted, "server did not boot on /health within 20s");
        const res = await fetch(`http://127.0.0.1:${PORT}/.well-known/402index-verify.txt`);
        assert.equal(res.status, 200);
        assert.match(res.headers.get("content-type") || "", /text\/plain/);
        const body = await res.text();
        assert.equal(body.trim(), EXPECTED_HASH);
        assert.ok(body.length < 1000, "verify file must be under 1KB");
    } finally {
        child.kill();
    }
});