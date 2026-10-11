import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import * as O from "../../packages/foundation/src/option";
import {
  LLMSnippetPreparer,
  mockLLMSnippetPreparerLayer,
  prepareLLMGeneratedSnippetForStorage,
  SnippetPreparationError,
} from "../../packages/application/src/prepare-llm-snippet";
import {
  createMemorySnippetArchive,
  createSnippetArchive,
  SnippetArchiveError,
} from "../../packages/application/src/snippet-archive";

const input = {
  heroId: "hero-a",
  nicoId: "nico-a",
  originalText: "  Keep the entire original.  ",
  originalPrompt: "The exact versioned request",
  source: { provider: "simulator", model: "nico", promptVersion: "1" },
};
const prepare = (id = "snippet-a") =>
  Effect.runPromise(
    prepareLLMGeneratedSnippetForStorage(input, { id, now: 100 }).pipe(
      Effect.provide(mockLLMSnippetPreparerLayer),
    ),
  );
const failure = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.match({
        onFailure: (error) => error,
        onSuccess: () => "unexpected success",
      }),
    ),
  );

describe("internal LLM snippet preparation", () => {
  it("preserves original text and prompt while preparing a separate value", async () => {
    const prepared = await prepare();
    expect(prepared).toEqual({
      ...input,
      id: "snippet-a",
      createdAt: 100,
      preparedText: input.originalText.trim(),
      deletedAt: O.none(),
    });
  });
  it("validates input before invoking any provider", async () => {
    let calls = 0;
    const layer = Layer.succeed(LLMSnippetPreparer)({
      prepare: () => {
        calls++;
        return Effect.succeed("text");
      },
    });
    const error = await failure(
      prepareLLMGeneratedSnippetForStorage(
        { ...input, originalText: " " },
        { id: "a", now: 100 },
      ).pipe(Effect.provide(layer)),
    );
    expect(error).toBeInstanceOf(SnippetPreparationError);
    expect(calls).toBe(0);
  });
  it("keeps provider failures typed", async () => {
    const layer = Layer.succeed(LLMSnippetPreparer)({
      prepare: () =>
        Effect.fail(
          new SnippetPreparationError(
            "provider-failure",
            "Preparation unavailable",
          ),
        ),
    });
    expect(
      await failure(
        prepareLLMGeneratedSnippetForStorage(input, { id: "a", now: 100 }).pipe(
          Effect.provide(layer),
        ),
      ),
    ).toMatchObject({ reason: "provider-failure" });
  });
  it("rejects blank provider output", async () => {
    const layer = Layer.succeed(LLMSnippetPreparer)({
      prepare: () => Effect.succeed(" "),
    });
    expect(
      await failure(
        prepareLLMGeneratedSnippetForStorage(input, { id: "a", now: 100 }).pipe(
          Effect.provide(layer),
        ),
      ),
    ).toMatchObject({ reason: "invalid-output" });
  });
});

describe("per-hero archival", () => {
  it("persists across adapter instances and isolates heroes", async () => {
    const data = new Map<string, string>();
    const storage = {
      read: (key: string) => O.fromNullable(data.get(key)),
      write: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const first = createSnippetArchive(storage);
    const snippet = await prepare();
    await Effect.runPromise(first.routines.append("hero-a", snippet));
    const second = createSnippetArchive(storage);
    expect(await Effect.runPromise(second.repository.list("hero-a"))).toEqual([
      snippet,
    ]);
    expect(await Effect.runPromise(second.repository.list("hero-b"))).toEqual(
      [],
    );
    expect(
      await failure(second.routines.append("hero-b", snippet)),
    ).toMatchObject({ reason: "ownership" });
  });
  it("soft deletes without removing source evidence and refuses conflicting replays", async () => {
    const archive = createMemorySnippetArchive();
    const snippet = await prepare();
    await Effect.runPromise(archive.routines.append("hero-a", snippet));
    await Effect.runPromise(archive.routines.append("hero-a", snippet));
    await Effect.runPromise(
      archive.routines.softDelete("hero-a", snippet.id, 200),
    );
    await Effect.runPromise(
      archive.routines.softDelete("hero-a", snippet.id, 300),
    );
    const records = await Effect.runPromise(archive.repository.list("hero-a"));
    expect(records).toEqual([{ ...snippet, deletedAt: O.some(200) }]);
    expect(
      await failure(archive.routines.append("hero-a", snippet)),
    ).toMatchObject({ reason: "conflict" });
    expect(
      await failure(archive.routines.softDelete("hero-b", snippet.id, 200)),
    ).toMatchObject({ reason: "not-found" });
  });
  it("does not evict older records as the archive grows", async () => {
    const archive = createMemorySnippetArchive();
    const base = await prepare();
    for (let i = 0; i < 1050; i++)
      await Effect.runPromise(
        archive.routines.append("hero-a", { ...base, id: `snippet-${i}` }),
      );
    const records = await Effect.runPromise(archive.repository.list("hero-a"));
    expect(records).toHaveLength(1050);
    expect(records[0]?.id).toBe("snippet-0");
  });
  it("surfaces quota failures explicitly", async () => {
    const archive = createSnippetArchive({
      read: () => O.none(),
      write: () => {
        throw new Error("quota");
      },
    });
    const error = await failure(
      archive.routines.append("hero-a", await prepare()),
    );
    expect(error).toBeInstanceOf(SnippetArchiveError);
    expect(error).toMatchObject({ reason: "storage" });
  });
  it("preserves corrupt storage rather than overwriting it", async () => {
    let writes = 0;
    const archive = createSnippetArchive({
      read: () => O.some("{bad"),
      write: () => {
        writes++;
      },
    });
    expect(
      await failure(archive.routines.append("hero-a", await prepare())),
    ).toMatchObject({ reason: "corrupt" });
    expect(writes).toBe(0);
  });
});
