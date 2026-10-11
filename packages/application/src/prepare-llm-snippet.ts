import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
  LLMSnippetInputSchema,
  PreparedLLMSnippetSchema,
  type LLMSnippetInput,
  type PreparedLLMSnippet,
} from "../../core/src/llm-snippet";
import * as O from "../../foundation/src/option";

export class SnippetPreparationError extends Error {
  readonly _tag = "SnippetPreparationError";
  constructor(
    readonly reason: "invalid-input" | "provider-failure" | "invalid-output",
    message: string,
  ) {
    super(message);
  }
}
export class LLMSnippetPreparer extends Context.Service<
  LLMSnippetPreparer,
  {
    readonly prepare: (
      input: LLMSnippetInput,
    ) => Effect.Effect<string, SnippetPreparationError>;
  }
>()("life/LLMSnippetPreparer") {}

export const mockLLMSnippetPreparerLayer = Layer.succeed(LLMSnippetPreparer)({
  prepare: (input) => Effect.succeed(input.originalText.trim()),
});
const contextSchema = z.strictObject({
  id: z.string().min(1),
  now: z.number().int().nonnegative(),
});
/** Internal application routine, deliberately absent from all public JSON routine catalogs. */
export const prepareLLMGeneratedSnippetForStorage = (
  input: unknown,
  context: { readonly id: string; readonly now: number },
): Effect.Effect<
  PreparedLLMSnippet,
  SnippetPreparationError,
  LLMSnippetPreparer
> =>
  Effect.gen(function* () {
    const parsed = LLMSnippetInputSchema.safeParse(input);
    const metadata = contextSchema.safeParse(context);
    if (!parsed.success || !metadata.success)
      return yield* Effect.fail(
        new SnippetPreparationError(
          "invalid-input",
          "Snippet content or metadata is invalid.",
        ),
      );
    const preparer = yield* LLMSnippetPreparer;
    const preparedText = yield* preparer.prepare(parsed.data);
    const result = PreparedLLMSnippetSchema.safeParse({
      ...parsed.data,
      id: metadata.data.id,
      createdAt: metadata.data.now,
      preparedText,
      deletedAt: O.none(),
    });
    if (!result.success)
      return yield* Effect.fail(
        new SnippetPreparationError(
          "invalid-output",
          "Snippet preparation produced invalid content.",
        ),
      );
    return result.data;
  });
