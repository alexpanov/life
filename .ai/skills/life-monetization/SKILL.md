---
name: life-monetization
description: Design life subscriptions, power-up packs, referral rewards and other transaction paths. Use for monetization domain boundaries, entitlements, pricing proposals or purchase flows.
---

# Monetization ports

Read ../../CONTRACT.md. Put the hero's good life ahead of revenue or engagement. Current stage: make the game work for Alex, learn from actual use, and improve it. Do not introduce checkout, prices, premium prompts or purchase pressure without new direction. The user's roughly $10/month idea is a positioning hypothesis, not an approved price or active subscription.

Treat a monetization port as a transaction path suited to a particular need: subscription, power-up pack, referral reward or another explicit value exchange. Keep these distinct from the in-game Port home destination and from XP/hero progression. Do not force every customer through the same offer.

Separate portable power-up templates from owned instances, remaining uses and verified entitlements. A template can describe context and instructions; it cannot grant ownership, extra usage or routine authority. Keep future sharing versioned and validated. Preserve Niko's locked canon and player control. Retain usage history; failed requests do not consume a power-up.

Require verified, idempotent backend receipts before granting paid or referral entitlements. Never accept purchases, prices, balances or verification claims from model output or imported saves. Keep billing adapters outside the functional core. Do not implement a fake purchase path as if payment succeeded.

When evaluating a future offer, state the concrete benefit, who needs it, its limit/expiry, fulfilment, cancellation/refund behavior and how to test usefulness. Prefer understandable, predictable prices over hidden costs, gambling mechanics or guilt about the hero's obligations. Measure whether the game helps before optimizing conversion.
