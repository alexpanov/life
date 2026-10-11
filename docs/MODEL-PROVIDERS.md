# Model connection status

The published client uses `mockNicoLayer`. No OpenAI, OpenRouter, Google, or other live model request is configured. There is no server-side API key or live model endpoint in this deployment. The JSON proposal schema and Effect service are adapter boundaries, not proof of a model connection.

## Low-cost candidate checked 2026-10-11 UTC

OpenRouter exposes several providers behind one API. Its current Llama 3.1 8B Instruct page lists DeepInfra at $0.02 per million input tokens and $0.04 per million output tokens. Other providers have different prices. Its FAQ reports JSON-schema structured output support and provider-dependent tool calling. This is a low-cost evaluation candidate, not a tested quality claim for Nico.

Source: https://openrouter.ai/meta-llama/llama-3.1-8b-instruct

Gemini 2.5 Flash-Lite is listed at $0.10 per million input and $0.40 per million output on OpenRouter. Check actual account/model availability before selecting it; Google restricts new direct usage of some legacy 2.5 models.

Sources:
- https://openrouter.ai/google/gemini-2.5-flash-lite
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash

## Integration boundary

Use a server-only API key and endpoint. Never add a provider secret to Vite environment variables or browser storage. Supply `NicoModel` with a live Layer that sends the existing schema and canonical system context, validates the returned proposal, limits output tokens, maps provider failures to `ModelError`, and keeps usage accounting atomic. Start with inexpensive model evaluation fixtures covering ambiguous deletion, locked traits, malformed JSON, canon consistency and no unsolicited actions. Provider pricing/availability and real response quality must be checked again when enabling it.

Account credit, model access, backend ownership and the secret are not provisioned by this document. Existing simulated usage limits do not create real provider charges.
