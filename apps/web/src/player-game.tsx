import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createGameController,
  type GameController,
} from "../../../packages/application/src/controller";
import { createSupabasePersistence } from "../../../packages/infrastructure/src/supabase";
import type {
  SaveSlot,
  SupabaseDatabase,
} from "../../../packages/infrastructure/src/supabase";
import { ensurePlayerSession } from "../../../packages/infrastructure/src/player-session";
import type { InteractionSurface } from "../../../packages/core/src/surface";
import * as E from "../../../packages/foundation/src/either";
import { App } from "./App";
import {
  browserContext,
  browserRepository,
  browserSnippetArchive,
} from "./repository";

export interface PlayerSessionPort {
  ensure(): Promise<E.Either<string, string>>;
  open(ownerId: string): GameController;
  openLocal(): GameController;
}

function saveKey(slot: SaveSlot): string {
  return slot === "starter" ? "questos.starter.v1" : "questos.v1";
}

export function supabasePlayerSession(
  client: SupabaseClient<SupabaseDatabase>,
  slot: SaveSlot,
  surface: InteractionSurface,
): PlayerSessionPort {
  const games = new Map<string, GameController>();
  const localGames: GameController[] = [];
  const key = saveKey(slot);
  return {
    ensure: () => ensurePlayerSession(client),
    open(ownerId) {
      const existing = games.get(ownerId);
      if (existing) return existing;
      const controller = createGameController(
        createSupabasePersistence(client, slot, ownerId),
        browserContext,
        browserSnippetArchive(key),
        surface,
      );
      games.set(ownerId, controller);
      void controller.load();
      return controller;
    },
    openLocal() {
      const existing = localGames[0];
      if (existing) return existing;
      const controller = createGameController(
        browserRepository(key),
        browserContext,
        browserSnippetArchive(key),
        surface,
      );
      localGames.push(controller);
      void controller.load();
      return controller;
    },
  };
}

/** Play starts here. No email, magic link, or password. */
export function PlayerGame({ session }: { session: PlayerSessionPort }) {
  const [controller, setController] = useState<GameController | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    void session.ensure().then((result) => {
      if (!active) return;
      if (result._tag === "Right") {
        setController(session.open(result.right));
        return;
      }
      setNotice("This save is only on this device.");
      setController(session.openLocal());
    });
    return () => {
      active = false;
    };
  }, [session]);
  if (!controller)
    return (
      <main className="app-shell">
        <p>Opening your game.</p>
      </main>
    );
  return (
    <>
      {notice ? (
        <p role="status">
          {notice}
        </p>
      ) : null}
      <App controller={controller} />
    </>
  );
}
