# Nico Lopez

The hero is the player. Nico is the hero's servant guide, with his own identity, prioritized jobs and resettable memory. The browser version creates and saves this pair locally. A fresh browser has no preloaded personal quests. Existing saves keep their quests and progress.

The conversational path is introduction, one active quest, reported outcome, name if unknown, one reflection, then a new priority. Progress notes belong to the quest history. Completing a quest is always an explicit player action; generated words do not complete it.

Jobs are per Nico. They record the introduction, learning the hero's name, and reflecting on outcomes. The model receives only the context it needs, without the hero's internal ID. A tagged Effect service supplies deterministic simulated dialogue today. Replacing it with a live provider must preserve typed failures, ownership, versioned prompt context and explicit player decisions.

Personality traits record their provenance: system, player, or learned. A deterministic routine can derive tentative support traits from the last five days of completed quests and jobs. Repeated execution must not duplicate traits. No background scheduler is deployed. A future per-player scheduler should invoke this same routine with an injected clock, not implement a second set of learning rules.

## Infrastructure status

Supabase's connected account reports no projects as of this update. The existing Supabase save adapter and migration remain unprovisioned; no cloud hero or Nico row is being created. Local saves carry the actual identities, jobs, memories and traits in the interim. Cloud onboarding requires a real development/live project, authenticated ownership and verified isolation before enabling that adapter. No real LLM is connected.
