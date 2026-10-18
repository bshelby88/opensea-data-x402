# Patch-overlay deploy (fleet pattern): base = the CURRENT live image so the
# rebuild is byte-identical to production except the overlaid files below.
# 2026-10-18 STRAT-103: overlay server.js which now serves
# /.well-known/402index-verify.txt (402index domain verification).
FROM registry.fly.io/opensea-data-x402@sha256:47f47719dca2458b15c316ea945990a07e8f18fbb2be6a81c9776329c68a9036
COPY recovered/server/src/paywall.js /app/dist/src/paywall.js
COPY recovered/server/src/server.js /app/dist/src/server.js
