import { createSnippetArchive } from "../../../packages/application/src/snippet-archive";
import * as O from "../../../packages/foundation/src/option";
import { persistenceFromStorage } from "../../../packages/application/src/persistence";
import type { TransitionContext } from "../../../packages/core/src/index";
export function browserRepository(key: string) {
  return persistenceFromStorage(
    {
      async getItem(name) {
        return localStorage.getItem(name);
      },
      async setItem(name, value) {
        localStorage.setItem(name, value);
      },
    },
    key,
  );
}
export function browserContext(): TransitionContext {
  const date = new Date();
  return {
    now: date.getTime(),
    eventId: crypto.randomUUID(),
    localDay: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  };
}

export function browserSnippetArchive(namespace: string) {
  return createSnippetArchive({
    read: (key) => O.fromNullable(localStorage.getItem(`${namespace}:${key}`)),
    write: (key, value) => localStorage.setItem(`${namespace}:${key}`, value),
  });
}
