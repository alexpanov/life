---
name: life-realtime-ux
description: Preserve focus, scroll, drafts and offline usability during life background routines, model replies, insights, notifications or Realtime updates. Use for subscriptions, async UI and reconnection behavior.
---

# Quiet background work

Read ../../CONTRACT.md. Keep the current task visually stable: do not navigate, steal focus, reset drafts, replace the whole screen or insert large panels when background work completes. Reserve space for short status messages. Update the central store and let the current view render the affected fields. Route secondary results to quiet notices or a destination the hero chooses to open.

Capture hero identity before async work and discard or isolate late results after a profile switch. Deduplicate events and prevent concurrent replay. Keep subscription cleanup and cancellation explicit. Never merge remote state over unsaved local edits without a conflict rule. Distinguish local subscriptions from a verified cloud Realtime connection.

Design offline use into the app. Keep previously cached screens, quests and local progress usable. Show Niko as resting while offline and preserve unsent conversation drafts. Do not silently simulate a supposedly live model response after a network failure. Never cache model API responses or credentials in the service worker. Treat navigator.onLine as a browser hint, not proof a provider is reachable. Explain that the app must first be loaded online to be cached.

Run daily insight work only while the hero is active in the app until a real backend scheduler exists. Use injected clocks, bounded evidence windows and durable per-hero deduplication. Insights remain tentative; they do not auto-change quests, personality or navigation. Failed background work must be retryable without duplicate effects or disruptive UI.

Test user-visible stability in JSDOM: draft survives offline/reconnect, focus remains where possible, duplicate updates do not repeat effects and old-hero responses do not touch the new hero. The test file sits next to the code it tests. Keep the browser smoke suite at one or two tests.
