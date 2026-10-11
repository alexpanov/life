export type Modal =
  | "quest"
  | "realm"
  | "dungeon"
  | "skill"
  | "practice"
  | "memory"
  | "reset"
  | "import"
  | "profiles"
  | "handoff"
  | "call"
  | "about"
  | "loot"
  | "blocked"
  | null;

import type { Command, selectGame } from "../../../packages/core/src/index";
export type GameView = ReturnType<typeof selectGame>;
export interface PageActions {
  send: (command: Command) => boolean;
  open: (kind: Modal, id?: string) => void;
}
