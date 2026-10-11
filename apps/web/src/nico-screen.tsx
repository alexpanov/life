import { useSyncExternalStore } from "react";
import type { Layer } from "effect";
import type { GameController } from "../../../packages/application/src/controller";
import {
  mockNicoLayer,
  type NicoModel,
} from "../../../packages/application/src/nico-model";
import * as O from "../../../packages/foundation/src/option";
import { NicoPage } from "./pages/NicoPage";

/** The lore page is not routed. Tests render it here. */
export function NicoScreen({
  controller,
  modelLayer = mockNicoLayer,
}: {
  controller: GameController;
  modelLayer?: Layer.Layer<NicoModel>;
}) {
  const store = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  if (!O.isSome(store.game)) return null;
  const game = store.game.value;
  const player =
    game.players.find((item) => item.id === game.activePlayerId) ??
    game.players[0]!;
  return (
    <NicoPage
      controller={controller}
      player={player}
      now={Date.now()}
      modelLayer={modelLayer}
      send={(command) => {
        controller.send(command);
        return true;
      }}
    />
  );
}
