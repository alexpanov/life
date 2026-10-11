---
name: quest-remove-worktree
description: Remove a git worktree after its pull request merges, delete the local branch, and return the primary checkout to the latest main. Use when a pull request has merged, when a worktree's branch has landed, or when the user says to remove a merged worktree. Applies to every repository, not only this one.
---

# Remove a merged worktree

A merged pull request is the order to remove the worktree.

Do not stop because the pull request is already merged. "Already merged" means you start at step 1 and finish every step. Do not report the task finished while the worktree directory still exists.

Do this from the primary checkout. The primary checkout is the folder whose `.git` is a directory, not a file that points at another checkout. If you are inside the worktree, leave it first.

The worktree lives in the sibling `worktrees` folder. The prefix is the primary checkout's directory name.

```
<parent>/
  life/                              # primary checkout, on main
  worktrees/
    life-<slug>/                     # the worktree to remove
```

## Steps

1. Confirm the pull request is merged. Match it by the worktree's branch:

```sh
gh pr list --state merged --head <branch> --json number,state,title
```

If that list is empty, stop. Do not remove a worktree whose pull request is still open, closed without merging, or missing.

A merged result is not a stop. Continue to step 2.

2. Look at the worktree. If a tracked file is modified, or an untracked file is source, stop and report. Do not force it. If the only leftovers are generated files (`node_modules`, `dist`, and other ignored build output), force is allowed.

```sh
git worktree remove "../worktrees/<prefix>-<slug>"
```

When only generated files block the remove:

```sh
git worktree remove --force "../worktrees/<prefix>-<slug>"
```

3. Delete the local branch. `git branch -d <branch>` is enough when the commits are in `main`. A squash merge will refuse `-d`. If the pull request is merged and `-d` refuses, delete it with `git branch -D <branch>`. The squash merge deletes the remote branch. Do not delete it a second time.

4. Rearm the primary checkout:

```sh
git checkout main
git pull --ff-only origin main
```

The primary checkout is then on the latest `main`, and the finished worktree is gone. Start the next branch as a new worktree. Do not start it in the primary checkout.
