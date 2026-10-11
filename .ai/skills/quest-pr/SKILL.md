---
name: quest-pr
description: Open a pull request from a worktree, run the release check before pushing, then squash-merge. Use when creating a pull request, pushing a branch, or merging your own pull request.
---

# Pull requests

Read `../../CONTRACT.md` relative to this file's directory. Place the worktree with `../quest-worktrees/SKILL.md`.

Do not open a pull request from the primary checkout. If you are not inside a worktree under the sibling `worktrees` folder, stop. Add that worktree, move into it, and run the rest of this skill from there. Tests, the push, and the pull request all happen in that worktree.

## Before the push

From the worktree, run:

```sh
pnpm run check
```

That is the pre-push gate. It runs the type check, lint, tests, the production build, and the encrypted-environment check. If it fails, do not push. Fix the failure and run the check again. Push only after it passes.

```sh
git push -u origin HEAD
```

## Open, then squash-merge

Open the pull request against `main`. Use a few emojis and one meme you choose. Weave the quest, the problem, and this change into that meme, and put the meme in the description.

Then squash-merge the pull request you just opened. Do not wait for a separate review. The local check is the gate.

```sh
gh pr merge --squash --delete-branch
```

If GitHub refuses the merge, stop and report the refusal. Do not force it.

After it merges, remove the worktree and return the primary checkout to the latest `main`, as `../quest-worktrees/SKILL.md` says.
