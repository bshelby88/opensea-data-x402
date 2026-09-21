# BriefSnap — Pricing

| Endpoint | Method | Price | Network |
|----------|--------|-------|---------|
| `/api/summarize` | POST | $1.00 | Base (eip155:8453) |

All prices are in USDC on Base mainnet. Payment is required via the x402 protocol before service execution.

## Flow
1. Send POST request without payment
2. Receive 402 Payment Required challenge with `PAYMENT-REQUIRED` header
3. Sign `transferWithAuthorization` with your wallet
4. Re-send with `PAYMENT-SIGNATURE` header

## Facilitator
`https://x402-agent-pay.com/facilitator`

## Contact
jadedfocus@gmail.com
