---
name: quest-worktrees
description: Put every extra git worktree in a sibling worktrees folder, and remove it after its pull request merges. Use when adding a worktree, when checkouts sit beside the main line, when cleaning a repository folder, or when a worktree's pull request has merged. Applies to every repository, not only this one.
---

# Worktree layout

The primary checkout is the main line. It is the folder whose `.git` is a directory, not a file that points at another checkout. Leave that folder where it is. Leave it on `main`.

Every other worktree goes in a sibling folder named `worktrees`, lowercase. Create `worktrees` when it is missing. Do not create it inside the primary checkout.

```
<parent>/
  life/                      # primary checkout, on main
  worktrees/
    life-pnpm/
    life-smoke-base/
```

`life` is an example. The prefix is the primary checkout's directory name. A repository checked out as `questos` uses `questos/` and `worktrees/questos-<slug>/`. The same rule applies to every repository.

## Names

Name each worktree `<prefix>-<relevant part>`.

The relevant part is the branch name with a leading verb dropped when what remains still names the work.

| Branch | Folder beside `life` |
| --- | --- |
| `use-pnpm` | `worktrees/life-pnpm` |
| `fix-smoke-site-base` | `worktrees/life-smoke-base` |

If dropping the verb would make the name vague, keep the branch name.

## Add a worktree

From the primary checkout:

```sh
mkdir -p ../worktrees
git worktree add "../worktrees/<prefix>-<slug>" -b <branch>
```

Do the branch work in that folder. Do not check the branch out in the primary checkout.

## Clean up

Run `git worktree list`. For each worktree that is not the primary checkout and does not already live under `<parent>/worktrees/`:

1. Move it. Keep the directory name when it is already `<prefix>-<slug>`. Otherwise move it onto that name.

```sh
mkdir -p ../worktrees
git worktree move <current-path> "../worktrees/<prefix>-<slug>"
```

2. If the destination already exists, stop and report both paths. Do not overwrite.
3. A move keeps uncommitted work. Do not reset, stash, or clean the worktree.
4. If `git worktree move` refuses because the tree is locked or in use, stop and report. Do not force it.

When the primary checkout is on a branch other than `main` and its working tree is clean, check out `main`, fast-forward it from `origin/main`, then add a worktree for the branch you left. When the working tree is dirty, leave it and report. Do not stash another agent's work.

`worktrees` is not part of the repository. Do not commit it.

## After the pull request merges

When the pull request for a worktree's branch has merged, retire that worktree and rearm the primary checkout. Do this from the primary checkout. If you are inside the worktree, leave it first.

1. Confirm the pull request is merged. Match it by the worktree's branch:

```sh
gh pr list --state merged --head <branch> --json number,state,title
```

If that list is empty, stop. Do not remove a worktree whose pull request is still open, closed without merging, or missing.

2. Look at the worktree. If a tracked file is modified, or an untracked file is source, stop and report. Do not force it. If the only leftovers are generated files (`node_modules`, `dist`, and other ignored build output), force is allowed.

```sh
git worktree remove "../worktrees/<prefix>-<slug>"
```

When only generated files block the remove:

```sh
git worktree remove --force "../worktrees/<prefix>-<slug>"
```

3. Delete the local branch. `git branch -d <branch>` is enough when the commits are in `main`. A squash merge will refuse `-d`. If the pull request is merged and `-d` refuses, delete it with `git branch -D <branch>`. Do not delete the remote branch.

4. Rearm the primary checkout:

```sh
git checkout main
git pull --ff-only origin main
```

The primary checkout is then on the latest `main`, and the finished worktree is gone. Start the next branch as a new worktree. Do not start it in the primary checkout.
