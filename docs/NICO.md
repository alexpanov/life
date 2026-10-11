# Nico Lopez

The hero is the player. Nico is the hero's servant guide, with his own identity, prioritized jobs and resettable memory. The browser version creates and saves this pair locally. A fresh browser has no preloaded personal quests. Existing saves keep their quests and progress.

The conversational path is introduction, one active quest, reported outcome, name if unknown, one reflection, then a new priority. Progress notes belong to the quest history. Completing a quest is always an explicit player action; generated words do not complete it.

Jobs are per Nico. They record the introduction, learning the hero's name, and reflecting on outcomes. The model receives only the context it needs, without the hero's internal ID. A tagged Effect service supplies deterministic simulated dialogue today. Replacing it with a live provider must preserve typed failures, ownership, versioned prompt context and explicit player decisions.

Personality traits record their provenance: system, player, or learned. A deterministic routine can derive tentative support traits from the last five days of completed quests and jobs. Repeated execution must not duplicate traits. No background scheduler is deployed. A future per-player scheduler should invoke this same routine with an injected clock, not implement a second set of learning rules.

## Infrastructure status

Supabase's connected account reports no projects as of this update. The existing Supabase save adapter and migration remain unprovisioned; no cloud hero or Nico row is being created. Local saves carry the actual identities, jobs, memories and traits in the interim. Cloud onboarding requires a real development/live project, authenticated ownership and verified isolation before enabling that adapter. No real LLM is connected.

## Stories and wisdom

Nico's Delta Force service and pride are locked fictional character canon. He grew up working a farm. That story is told only when the player asks, and the player can let it go. His profile identifies him as a fictional companion. The game does not present the authored episodes as historical operations. Stories have stable IDs and canonical facts; only curated, compatible retellings can be delivered. Asking explicitly makes a story eligible. A telling is recorded before its text is returned.

Wisdom has its own delivery record. Once delivered, an item is excluded from future rotation for that hero, including after a personality reset. Feedback uses a typed reason (`not-interesting`, `repetitive`, `not-for-me`, or `other`) and an optional explanation. Forgetting retains a timestamped tombstone and delivery history. Locked service canon cannot be retired.

## Model boundary

Chat is an untrusted input. A model receives an allowlisted routine schema and limited context, then proposes structured JSON. The application validates that proposal and binds it to the current hero; the domain enforces target ownership and locked traits again. Unknown routine names and parameters fail without changing state. Ambiguous deletion requests ask for a target. The current implementation uses a deterministic simulator through an Effect service; it makes no live LLM requests.

Realtime is an infrastructure subscription, not a second game engine. Incoming events must trigger an authenticated repository read; their payloads do not directly overwrite game state. A connected Supabase project and verified ownership policies are prerequisites for enabling cloud persistence and Realtime.
