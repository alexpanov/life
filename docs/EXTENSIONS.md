# Data extensions

Import data-only campaign templates, extension packs and reviewed patches through Workshop. Examples are in `examples/`. Imported data is validated before application; a failed patch cannot mutate the current game.

All interface changes go through `Command` → `executeRoutine` → pure `transition`. Subscribe to controller snapshots for interface updates. The retired global `window.QuestOS` event bus is no longer a supported API; use the typed controller boundary.

Domain extensions must preserve save compatibility, one active mission, confirmation before completion, and atomic imports. Read the model-agnostic functional-core skill before changing the domain.
