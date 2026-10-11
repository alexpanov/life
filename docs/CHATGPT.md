# ChatGPT and hosting handoff

## What this build actually provides

A standalone browser game and a manual copy/paste ChatGPT bridge. No native app registration, Sites project, MCP endpoint, hosting connection, cloud account, or store listing has been created.

The current chat had file/code tools but no usable Sites creation tool or connected deployment provider. A Vercel connection was offered, not installed or used. The build is usable independently of that connection.

## Fast route to a phone-friendly URL

Connect an authorized static-site hosting account and deploy `dist/`. The existing `vercel.json` selects `node build.mjs` and `dist` as its output. For colleague distribution, use `node build.mjs --share` instead; this strips the personal campaign and starts with a clean player.

Confirm access controls before sharing. A public URL is different from a private workspace preview. Neither is an App Store submission. This package does not assume that any particular protection tier is free.

## Route through ChatGPT Sites

OpenAI's current documentation describes creating and previewing Sites in Work on ChatGPT web or the supported desktop surface, with access determined by the account and workspace. It also describes hosting MCP servers in Sites. Those capabilities are not automatically available as tools in every conversation.

Official documentation checked for this build:

- Creating and using ChatGPT Sites: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- Build with the Apps SDK: https://help.openai.com/en/articles/12515353-build-with-the-apps-sdk
- Developer mode and MCP apps: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt

Attach this source package in a Sites-capable context and use this prompt:

```text
@Sites Build a PRIVATE PREVIEW of the attached QuestOS app.
Use the supplied implementation, not a replacement mockup.
Do not publish to an app/plugin directory or expose a public URL.
Preserve the responsive retro terminal design, raised buttons,
local saves, reusable campaigns, skill readiness decay, recovery mode,
reviewed JSON imports, and optional simulated operator calls.
Run the included rule tests. Review mobile controls.
For colleague access, build with --share to remove the personal seed.
Show me the private preview and leave publication/access changes for approval.
Do not claim that local browser state is a multiuser database.
```

## Native conversational app: next stage

This is not implemented in v0.1. A future adapter should use the existing pure engine rather than duplicating the rules.

Suggested tools are `get_game`, `create_objective`, `set_objective_status`, `log_practice`, and `install_extension`. Every write should require an authenticated player and explicit confirmation for destructive or completion-state changes. Return the same validated game snapshot to the chat UI and ordinary web UI.

Cloud persistence needs authentication, owner-scoped storage, revision numbers or ETags, concurrency handling, data export/deletion, and a real privacy policy. Do not use a player name or guessable player ID as authentication. Do not deploy a shared in-memory player object for colleagues.

An MCP transport stub without authentication would not complete this integration safely, so none is presented as a working native app.
