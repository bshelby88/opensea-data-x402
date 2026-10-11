FROM registry.fly.io/opensea-data-x402:deploy144b
COPY recovered/server/src/paywall.js /app/dist/src/paywall.js
