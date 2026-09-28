# Recovered wall source (2026-09-28)

Compiled dist + package.json extracted from Fly image
`registry.fly.io/opensea-data-x402:deployment-01M32E5Y8FYH9WQK51BEFG82SD` (the
original wall build, deployed Sep 21; TS sources were never committed).
Recovered after a different app (RAEN Revenue Optimizer) was deployed over the
wall's hostname on Sep 27, 404-ing `POST /api`. Live machine now runs this image
again (machine 48e013ecd27028) with CDP + OpenSea secrets restored from
~/.secrets/raen-harvest-20260918 and ~/.opensea.
