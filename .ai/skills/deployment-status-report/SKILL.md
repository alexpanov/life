---
name: deployment-status-report
description: Report QuestOS deployment status in one scannable block with a clickable run link. Use after a push, a GitHub Actions run, or any question about whether a deploy is complete, in progress, failed, or not started.
---

# Deployment status report

Read `../../CONTRACT.md`. Report only what you observed on the run and on the live health check. Do not describe a prepared workflow as a finished deploy.

Use this block and nothing else for the status itself:

```markdown
| | |
| --- | --- |
| Status | none |
| Run | [title](https://github.com/alexpanov/life/actions/runs/RUN_ID) |
| Commit | short sha |
| Branch | main |
| Health check | [life/healthcheck](https://alexpanov.github.io/life/healthcheck/) |
| Database | not started |
```

Status is exactly one of these words:

- **none** — no run exists for this commit
- **in progress** — the run has not finished
- **complete** — the run finished successfully and the health check shows this commit
- **failed** — the run finished with a failure, or the health check does not show this commit

The run cell is a clickable link. If there is no run, write "No run" with no link.

Database is one of: `not started`, `in progress`, `development only`, `development and live`, `failed`. A push to `main` is the only event that applies the database. A pull request does not.

Answer any separate question in a sentence before this block. Do not add a second status table.
