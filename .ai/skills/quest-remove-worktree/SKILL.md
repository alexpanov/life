---
name: quest-remove-worktree
description: Remove a git worktree after its pull request merges, delete the local branch, and return the primary checkout to the latest main so that checkout contains the merge. Use when a pull request has merged, when a worktree's branch has landed, or when the user says to remove a merged worktree. Applies to every repository, not only this one.
---

# Remove a merged worktree

A merged pull request is the order to remove the worktree and bring the primary checkout up to date with that merge.

Do not stop because the pull request is already merged. "Already merged" means you start at step 1 and finish every step. Do not report the task finished while the worktree directory still exists. Do not report it finished while the primary checkout is not on `main` with that merge pulled down.

Do this from the primary checkout. The primary checkout is the folder whose `.git` is a directory, not a file that points at another checkout. If you are inside the worktree, leave it first. If the session root is the worktree, move the session to the primary checkout before you remove the directory. The pull runs in the primary checkout. Do not run it in the directory you are about to delete.

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

A merged result is not a stop. Continue to step 2. Keep the pull request number for step 5.

2. Look at the worktree. If a tracked file is modified, or an untracked file is source, stop and report. Do not force it. If the only leftovers are generated files (`node_modules`, `dist`, and other ignored build output), force is allowed.

```sh
git worktree remove "../worktrees/<prefix>-<slug>"
```

When only generated files block the remove:

```sh
git worktree remove --force "../worktrees/<prefix>-<slug>"
```

3. Delete the local branch. `git branch -d <branch>` is enough when the commits are in `main`. A squash merge will refuse `-d`. If the pull request is merged and `-d` refuses, delete it with `git branch -D <branch>`. The squash merge deletes the remote branch. Do not delete it a second time.

4. Return the primary checkout to `main` and pull the merge. Change into the primary checkout, then:

```sh
git checkout main
git pull --ff-only origin main
```

That pull is what puts the merged code on disk. Removing the worktree does not update `main`.

If the primary checkout has uncommitted work, stop and report. Do not stash, reset, or discard it. Do not pull over it.

If the pull is not a fast-forward, stop and report. Do not rebase or reset.

5. Confirm both ends of the job. In the primary checkout:

```sh
git status -sb
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git rev-parse origin/main
gh pr view <number> --json mergeCommit --jq .mergeCommit.oid
git merge-base --is-ancestor <merge-commit> HEAD
```

The branch is `main`. `HEAD` and `origin/main` are the same commit. That commit is the merge, or the merge is an ancestor of it. The worktree directory is gone. The files in the primary checkout match that commit. Do not edit them.

The task is finished only when both are true: the worktree is gone, and the primary checkout is on that updated `main`. Start the next branch as a new worktree. Do not start it in the primary checkout.
