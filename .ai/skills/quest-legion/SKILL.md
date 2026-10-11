---
name: quest-legion
description: Coordinate multiple agents working on QuestOS with exclusive file ownership, stable contracts and evidence-based integration. Use when the user requests a legion, swarm, delegation or parallel agent work.
---

# Agent legion

Read `../../CONTRACT.md` relative to this file's directory. Use the host's available agent mechanism; these files do not install a swarm runtime or grant new permissions.

1. Appoint one coordinator to own scope, integration, shared configuration and release. Inspect Git status and existing ownership before assigning work.
2. Split only independently useful work. Give each agent a concrete result, exclusive writable paths, read-only dependencies, an interface contract and required verification. Assign shared manifests, lockfiles, root exports and workflow files to one owner.
3. Allow agents to read shared code. Require a message before crossing another owner's write boundary. Reassign ownership explicitly rather than having two agents edit one file. Do not reset, stash, clean or revert another agent's work.
4. Keep domain/UI/backend contracts explicit. Communicate changed types or assumptions promptly. Prefer agreeing on signatures before parallel implementation. Delegate only within the user's authorized scope; no agent gains broader authority by being delegated a task.
5. Require each handoff to list changed files, behavior, exact checks/results, incomplete work and risks. Treat test output and diffs as evidence, not confidence claims. Have the coordinator inspect the combined diff and rerun integration gates after merging contributions.
6. Let the coordinator handle dependency installs, final formatting of shared files, commits, pushes, migrations and deployment unless explicitly reassigned. Never publish while another agent still writes to the release tree. In a shared checkout, do not assume a commit contains only your task.
7. Finish with one truthful integrated report. Distinguish delivered code, locally checked behavior, CI results and observed live behavior. Record unresolved blockers instead of burying them in agent handoffs.

Use isolated worktrees when the host supports them and parallel changes cannot have disjoint paths. Place and clean them up with `../quest-worktrees/SKILL.md`. Keep branch/rebase operations under a named owner. Do not create parallel agents merely to multiply activity; use them to remove independent bottlenecks.
