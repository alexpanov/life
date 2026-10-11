---
name: dont-make-me-think
description: Simplify life mobile screens, onboarding, quest actions and Niko conversations. Use whenever adding or changing player-facing navigation, content, controls, forms or messages.
---

# Don't make me think

Read `../../CONTRACT.md`. Treat the mobile player’s attention as the constraint.

1. Name the one decision this screen helps the player make. Give it one primary action and at most one secondary action. Put other destinations behind a clearly named link or menu; retain existing routes and saves.
2. Show the current quest once. Give it **Complete quest** and **Make progress**. Put history and notes on its own screen. Do not repeat it in a global banner above a quest list.
3. Make a conversation one question at a time: meet Niko → act → celebrate the outcome → ask the hero's name if unknown → ask what helped → choose the next quest. Persist answers and completed jobs; do not restart introductions on reload.
4. Keep the hero in charge. Let Niko guide and remember, never claim completion on the hero's behalf. Separate Niko's voice (name, icon, readable serif copy) from game status. Hide IDs, internal jobs, OODA and after-action mechanics.
5. Use a readable body font of at least 16px and touch targets at least 44px. Keep controls within the viewport without horizontal scrolling. Reserve monospace for small technical details, not entire paragraphs. Support reduced motion and keyboard focus.
6. Use short labels describing the result. Remove repeated sender banners, success notices and atmospheric copy if they obscure the next action. Empty states must offer a clear next step.
7. Use disclosure for optional settings, editing and advanced tools. A menu may list destinations; it must not also expose their controls. A form may collect necessary fields; avoid showing unrelated forms on the same screen.
8. Check the actual journey in React JSDOM: start, active quest, completion, unknown/known name, reflection, progress history and reload. Keep the existing single browser launch test. Inspect mobile layout when browser QA is available; state when it is unavailable.

Do not replace domain rules with UI conditionals. Call typed commands and routines; render their results. Keep mocked model output behind the same Effect service boundary as a future live model.

Keep Port one thumb tap away through the bottom circular home control. Use actionable in-game notices for events while the game is visible, rather than adding persistent sections. Put notification permission/testing on a focused settings screen; never repeatedly trigger browser permission dialogs or show OS notifications over the visible game.
