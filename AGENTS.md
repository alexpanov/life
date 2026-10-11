# QuestOS agent entry point

Our enduring purpose: help the hero live a good life, the life the Lord has for him, with less friction and pressure. Every change must serve that purpose.

Read [.ai/CONTRACT.md](.ai/CONTRACT.md) before changing this repository. It is the canonical engineering and product agreement for every model and editor.

Load the relevant task skill:

- Domain, effects, persistence: [.ai/skills/quest-functional-core/SKILL.md](.ai/skills/quest-functional-core/SKILL.md)
- Prisma repositories: [.ai/skills/prisma-repositories/SKILL.md](.ai/skills/prisma-repositories/SKILL.md)
- Boundary parsing: [.ai/skills/parse-dont-validate/SKILL.md](.ai/skills/parse-dont-validate/SKILL.md)
- Mobile clarity and progressive disclosure: [.ai/skills/dont-make-me-think/SKILL.md](.ai/skills/dont-make-me-think/SKILL.md)
- Gameplay, Nico, interface: [.ai/skills/quest-product/SKILL.md](.ai/skills/quest-product/SKILL.md)
- Tests, CI, deployment: [.ai/skills/quest-release/SKILL.md](.ai/skills/quest-release/SKILL.md)
- Deployment status report: [.ai/skills/deployment-status-report/SKILL.md](.ai/skills/deployment-status-report/SKILL.md)
- Monetization, entitlements and transaction paths: [.ai/skills/life-monetization/SKILL.md](.ai/skills/life-monetization/SKILL.md)
- Background updates and offline UX: [.ai/skills/life-realtime-ux/SKILL.md](.ai/skills/life-realtime-ux/SKILL.md)
- Parallel work: [.ai/skills/quest-legion/SKILL.md](.ai/skills/quest-legion/SKILL.md)
- Worktree placement: [.ai/skills/quest-worktrees/SKILL.md](.ai/skills/quest-worktrees/SKILL.md)
- Merged worktree removal: [.ai/skills/quest-remove-worktree/SKILL.md](.ai/skills/quest-remove-worktree/SKILL.md)
- Pull requests: [.ai/skills/quest-pr/SKILL.md](.ai/skills/quest-pr/SKILL.md)

Keep the primary checkout on `main`. Extra worktrees belong in the sibling `worktrees` folder. Load the worktree skill and move any that sit beside the main line. When a worktree's pull request has merged, including when you find it already merged, load the merged worktree removal skill and follow every step. Do not stop at the merge.

Inspect current source, package scripts and Git status before acting. Preserve other agents' work. Follow the user's current scope and the host's higher-priority rules. Report executed checks and observed deployment results; never turn a goal into an unverified claim.

When you open a pull request, load the pull request skill first. Do the work from a worktree. Run the release check there. Push only after it passes, then squash-merge.
