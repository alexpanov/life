# Routine, form and model boundaries

The frontend calls `executeFrontendRoutine` with a versioned JSON envelope. See `frontend-routines.schema.json` for the exact allowlist. A request names its routine, parameters and request ID; its Effect result reports the request and transition. The existing controller is the only game-state store, consumed through React `useSyncExternalStore`. No parallel Redux/Zustand store is introduced.

The adapter is in-process. The gameplay routine dispatcher remains local. A separate same-origin HTTP model gateway is now packaged with the site; there is no live cloud state subscription. Successful request IDs are deduplicated within a controller lifetime; changed parameters and cross-hero replay fail. A network adapter must bind identity from an authenticated session, enforce durable idempotency and serialize concurrent writes. Imports remain the existing reviewed import flow, outside the JSON routine allowlist.

## Forms

`core/forms.ts` contains versioned chat, feedback and personality form definitions. Validation returns Either with field issues. Nico's web forms use React Hook Form; domain code contains no React imports. Other legacy game forms can migrate to the same catalog without replacing their domain routines.

## Evidence archive

`prepareLLMGeneratedSnippetForStorage` returns `Effect<PreparedLLMSnippet, SnippetPreparationError, LLMSnippetPreparer>`. It is internal and absent from both public routine catalogs. The simulator trims prepared text while retaining the complete original text and prompt. Provider, model and prompt-version fields travel with each record. Current chat provenance is the application-level Nico model service; a live provider must supply its actual model identity.

The web archive uses separate per-hero storage records scoped to live/starter. Nico chat responses, including JSON proposals rejected by validation, are archived before proposed mutation. Archive failure aborts the proposal and releases reserved energy. No records are evicted. Archive ports support soft deletion; the archive is never automatically replayed into model context. Ordinary memory forgetting affects active recall; it does not erase prior archived evidence. The archive is separate from the legacy game export file and has its own repository API.

These are local browser records, subject to browser quota and clearing. The synchronous adapter serializes operations within one runtime, not across tabs or devices. A transactional database adapter remains future work. This does not yet record every UI event, failed provider request or onboarding reply.

## Internal mind

`thinkThought(environment, previousThoughtIds)` returns a typed Effect through `ThinkThoughtModel`. `Hero extends Person`; environment people are readonly. The 20 curated thoughts select rest, quest, family, faith or orientation based on context. A topic's thoughts rotate before repeating. The caller owns history; this routine does not start a schedule or inject unsolicited dialogue. It returns a concise assessment and suggested next action, never private chain-of-thought. This is an internal, tested building block, not a connected autonomous agent.

## Provider integration

The installed Effect 4 package includes `effect/ai/LanguageModel`: text generation, schema-based object generation, streaming and provider-neutral services. `infrastructure/effect-ai-nico.ts` adapts that service to NicoModel; no vendor client or API key enters the core or browser. An injected fake LanguageModel tests the adapter. A separate gateway accepts Anthropic and OpenAI-compatible HTTP protocols through typed Effect operations. The adapter separates system instructions from user data, applies a timeout and parses JSON; the existing Nico protocol then validates and authorizes every proposal. No routine executes directly from a provider response.

Use a server-side Anthropic or OpenAI-compatible provider layer later. Compatible protocol does not imply identical model behavior or reliable tool calls. Claude Code is an agent client; exposing these routines to it would require a separately authenticated HTTP/MCP bridge. That bridge is not deployed. Provider-neutral tests are not a live Claude, Grok or third-party compatibility certification.

Official references inspected:
- https://effect.website/docs/v4/api/effect/ai/LanguageModel
- https://effect.website/docs/v4/api/effect/ai/Toolkit
- https://github.com/Effect-TS/effect/blob/main/packages/ai/anthropic/src/AnthropicLanguageModel.ts
- https://docs.x.ai/developers/rest-api-reference/inference
- https://github.com/react-hook-form/react-hook-form

Alex subsequently requested model integration now. The gateway is implemented, but no provider credential or pilot-user configuration exists. The app simulates only when the server explicitly reports no model configured. Network/provider/authentication failures never silently turn into simulated success.

## Gateway operation

`/api/nico/status` returns configuration/authorization booleans only. `/api/nico/propose` spends the model key only when the host proves a caller id matching `LIFE_LLM_ALLOWED_USER_ID`. A request header is not that proof. Configure `LIFE_LLM_PROTOCOL` (`anthropic`, `openai-compatible`, or `openrouter`), `LIFE_LLM_MODEL`, and secret `LIFE_LLM_API_KEY` in hosted runtime settings. `openrouter` calls `https://openrouter.ai/api/v1/chat/completions` and does not need `LIFE_LLM_ENDPOINT`. A base of `https://openrouter.ai/api/v1` is accepted and completed to that chat path. Other OpenRouter paths are rejected. `openai-compatible` still requires a full `LIFE_LLM_ENDPOINT`. Supported hosts are api.anthropic.com, api.openai.com, openrouter.ai and api.x.ai. The selected model must support the protocol, including JSON object output for OpenAI-compatible calls. No default model is selected here.

The gateway sends canonical server-owned instructions, validates request and response, limits response tokens, rejects redirects and does not execute proposed game routines. This is an owner-only pilot: local game energy is not server billing enforcement, and no multi-user paid service should be enabled before durable quotas. Onboarding/completion replies and thoughts remain simulated. No provider compatibility is claimed from mocked tests alone.

## Power-ups and insights

Portable power-up templates are separate from Niko-owned charges. Three default templates and custom creation are available at /#/powerups. One activation lasts at most 30 minutes and applies to the next successful conversation request. Energy, activation identity and power-up charge commit together; provider failure and free memory-management requests do not consume a power-up. Sharing/importing paid entitlements and checkout are not enabled.

Background insights use the prior 24 hours once per rolling day while active, or the latest five chats when that set changes. They are persisted per hero, deduplicated and simulated; they do not move focus, navigate, alter quests or claim a server schedule.
