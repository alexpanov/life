import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
  PreparedLLMSnippetSchema,
  type PreparedLLMSnippet,
} from "../../core/src/llm-snippet";
import * as O from "../../foundation/src/option";

export class SnippetArchiveError extends Error {
  readonly _tag = "SnippetArchiveError";
  constructor(
    readonly reason:
      | "storage"
      | "corrupt"
      | "ownership"
      | "conflict"
      | "not-found"
      | "invalid",
    message: string,
  ) {
    super(message);
  }
}
export class SnippetArchiveRepository extends Context.Service<
  SnippetArchiveRepository,
  {
    readonly list: (
      heroId: string,
    ) => Effect.Effect<readonly PreparedLLMSnippet[], SnippetArchiveError>;
  }
>()("life/SnippetArchiveRepository") {}
export class SnippetArchiveRoutines extends Context.Service<
  SnippetArchiveRoutines,
  {
    readonly append: (
      heroId: string,
      snippet: PreparedLLMSnippet,
    ) => Effect.Effect<PreparedLLMSnippet, SnippetArchiveError>;
    readonly softDelete: (
      heroId: string,
      id: string,
      now: number,
    ) => Effect.Effect<PreparedLLMSnippet, SnippetArchiveError>;
  }
>()("life/SnippetArchiveRoutines") {}
/** Synchronous storage makes each read-modify-write atomic within this JS runtime. */
export interface SnippetArchiveStorage {
  readonly read: (key: string) => O.Option<string>;
  readonly write: (key: string, value: string) => void;
}
const archiveSchema = z.strictObject({
  version: z.literal(1),
  records: z.array(PreparedLLMSnippetSchema),
});
const keyFor = (heroId: string): string =>
  `life:llm-snippets:v1:${encodeURIComponent(heroId)}`;
const attempt = <A>(run: () => A): Effect.Effect<A, SnippetArchiveError> =>
  Effect.try({
    try: run,
    catch: (error) =>
      error instanceof SnippetArchiveError
        ? error
        : new SnippetArchiveError(
            "storage",
            "Could not access the snippet archive. Existing records were not discarded.",
          ),
  });
/** Local persistence adapter. It never evicts records or adds archive content to a model prompt. */
export function createSnippetArchive(storage: SnippetArchiveStorage) {
  const read = (heroId: string): readonly PreparedLLMSnippet[] => {
    if (!heroId.trim())
      throw new SnippetArchiveError("invalid", "A hero is required.");
    const raw = storage.read(keyFor(heroId));
    if (O.isNone(raw)) return [];
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw.value);
    } catch {
      throw new SnippetArchiveError(
        "corrupt",
        "The snippet archive is unreadable; it has been preserved.",
      );
    }
    const parsed = archiveSchema.safeParse(decoded);
    if (!parsed.success)
      throw new SnippetArchiveError(
        "corrupt",
        "The snippet archive is invalid; it has been preserved.",
      );
    if (parsed.data.records.some((record) => record.heroId !== heroId))
      throw new SnippetArchiveError(
        "ownership",
        "The snippet archive belongs to another hero.",
      );
    if (
      new Set(parsed.data.records.map((record) => record.id)).size !==
      parsed.data.records.length
    )
      throw new SnippetArchiveError(
        "corrupt",
        "The snippet archive has duplicate identifiers.",
      );
    return parsed.data.records;
  };
  const write = (heroId: string, records: readonly PreparedLLMSnippet[]) =>
    storage.write(keyFor(heroId), JSON.stringify({ version: 1, records }));
  const repository = { list: (heroId: string) => attempt(() => read(heroId)) };
  const routines = {
    append: (heroId: string, snippet: PreparedLLMSnippet) =>
      attempt(() => {
        const parsed = PreparedLLMSnippetSchema.safeParse(snippet);
        if (!parsed.success)
          throw new SnippetArchiveError(
            "invalid",
            "The prepared snippet is invalid.",
          );
        if (parsed.data.heroId !== heroId)
          throw new SnippetArchiveError(
            "ownership",
            "Cannot save another hero’s snippet.",
          );
        const records = read(heroId);
        const existing = records.find((record) => record.id === snippet.id);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(parsed.data))
            throw new SnippetArchiveError(
              "conflict",
              "This snippet identifier already has different content.",
            );
          return existing;
        }
        write(heroId, [...records, parsed.data]);
        return parsed.data;
      }),
    softDelete: (heroId: string, id: string, now: number) =>
      attempt(() => {
        if (!Number.isSafeInteger(now) || now < 0)
          throw new SnippetArchiveError(
            "invalid",
            "The deletion time is invalid.",
          );
        const records = read(heroId);
        const existing = records.find((record) => record.id === id);
        if (!existing)
          throw new SnippetArchiveError(
            "not-found",
            "Snippet was not found for this hero.",
          );
        if (O.isSome(existing.deletedAt)) return existing;
        if (now < existing.createdAt)
          throw new SnippetArchiveError(
            "invalid",
            "Deletion cannot precede creation.",
          );
        const deleted = { ...existing, deletedAt: O.some(now) };
        write(
          heroId,
          records.map((record) => (record.id === id ? deleted : record)),
        );
        return deleted;
      }),
  };
  return {
    repository,
    routines,
    layer: Layer.merge(
      Layer.succeed(SnippetArchiveRepository)(repository),
      Layer.succeed(SnippetArchiveRoutines)(routines),
    ),
  };
}
export const createSnippetArchiveLayer = (storage: SnippetArchiveStorage) =>
  createSnippetArchive(storage).layer;
/** A fresh isolated fallback per application instance, never a global shared hero archive. */
export function createMemorySnippetArchive() {
  const records = new Map<string, string>();
  return createSnippetArchive({
    read: (key) => O.fromNullable(records.get(key)),
    write: (key, value) => {
      records.set(key, value);
    },
  });
}
