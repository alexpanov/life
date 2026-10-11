import { Effect } from "effect";
import type { Option } from "../../foundation/src/option";
import * as O from "../../foundation/src/option";
import { unit, type Unit } from "../../foundation/src/unit";
export class RepositoryError extends Error {
  readonly _tag = "RepositoryError";
  constructor(
    readonly operation: string,
    override readonly cause: unknown,
  ) {
    super(`Save ${operation} failed.`);
    this.name = "RepositoryError";
  }
}
/** Repositories only read. Routines perform writes. Both describe Effects. */
export interface GameRepository {
  readonly load: () => Effect.Effect<Option<string>, RepositoryError>;
  readonly backup: () => Effect.Effect<Option<string>, RepositoryError>;
}
export interface SaveRoutines {
  readonly save: (
    value: string,
    previous: Option<string>,
  ) => Effect.Effect<Unit, RepositoryError>;
}
export interface Persistence {
  readonly repository: GameRepository;
  readonly routines: SaveRoutines;
}
export function createMemoryPersistence(): Persistence {
  let current: Option<string> = O.none(),
    backup: Option<string> = O.none();
  return {
    repository: {
      load: () => Effect.sync(() => current),
      backup: () => Effect.sync(() => backup),
    },
    routines: {
      save: (value, previous) =>
        Effect.sync(() => {
          current = O.some(value);
          backup = previous;
          return unit;
        }),
    },
  };
}
export function persistenceFromStorage(
  storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  },
  key: string,
): Persistence {
  const read = (name: string) =>
    Effect.tryPromise({
      try: async () => O.fromNullable(await storage.getItem(name)),
      catch: (cause) => new RepositoryError("read", cause),
    });
  return {
    repository: { load: () => read(key), backup: () => read(`${key}.backup`) },
    routines: {
      save: (value, previous) =>
        Effect.tryPromise({
          try: async () => {
            if (O.isSome(previous))
              await storage.setItem(`${key}.backup`, previous.value);
            await storage.setItem(key, value);
            return unit;
          },
          catch: (cause) => new RepositoryError("write", cause),
        }),
    },
  };
}
