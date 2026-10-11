# Model connection status

The published client uses `mockNicoLayer` until the server reports a configured model. The GitHub Page does not call the model function, so play stays on that stand-in. The server gateway can call OpenRouter chat completions when `LIFE_LLM_PROTOCOL=openrouter`, `LIFE_LLM_MODEL`, and secret `LIFE_LLM_API_KEY` are set in the hosted runtime. No API key, model, or pilot user is stored in this repository, and no live OpenRouter request has been made from here. The JSON proposal schema and Effect service are adapter boundaries, not proof of a model connection.

## Low-cost candidate checked 2026-10-11 UTC

OpenRouter exposes several providers behind one API. Its current Llama 3.1 8B Instruct page lists DeepInfra at $0.02 per million input tokens and $0.04 per million output tokens. Other providers have different prices. Its FAQ reports JSON-schema structured output support and provider-dependent tool calling. This is a low-cost evaluation candidate, not a tested quality claim for Nico.

Source: https://openrouter.ai/meta-llama/llama-3.1-8b-instruct

Gemini 2.5 Flash-Lite is listed at $0.10 per million input and $0.40 per million output on OpenRouter. Check actual account/model availability before selecting it; Google restricts new direct usage of some legacy 2.5 models.

Sources:
- https://openrouter.ai/google/gemini-2.5-flash-lite
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash

## Integration boundary

OpenRouter is an added provider on the existing gateway, not a replacement for Anthropic or the other allowlisted hosts. The key is read from server environment only. The gateway posts to `https://openrouter.ai/api/v1/chat/completions` with a bearer token, server-owned instructions, a 1000 token cap, and JSON object mode. It does not accept a caller-chosen URL. Never add a provider secret to Vite environment variables or browser storage. The chosen model remains an operator setting. Provider pricing, availability, and real response quality must be checked again before enabling a live model. Mocked gateway tests do not certify live OpenRouter behavior.

Account credit, model access, backend ownership and the secret are not provisioned by this document. Existing simulated usage limits do not create real provider charges.
