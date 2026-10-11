/** JSON v1 compatibility is an I/O boundary. Nullable wire fields never enter the model. */
import type { Snapshot } from "./types";
import * as O from "../../foundation/src/option";
export function serializeGame(game: Snapshot): string {
  return JSON.stringify({
    ...game,
    players: game.players.map((p) => ({
      ...p,
      checkin: O.match(
        p.checkin,
        () => null,
        (c) => c,
      ),
      draftQuest: O.match(
        p.draftQuest,
        () => null,
        (draft) => ({
          id: draft.id,
          title: draft.title,
          realmId: O.match(
            draft.realmId,
            () => null,
            (id) => id,
          ),
        }),
      ),
      campaigns: p.campaigns.map((c) => ({
        ...c,
        quests: c.quests.map((q) => ({
          ...q,
          completedAt: O.match(
            q.completedAt,
            () => null,
            (n) => n,
          ),
        })),
      })),
    })),
  });
}
