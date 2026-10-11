import { z } from "zod";

const text = z.string().refine((value) => value.trim().length > 0);
export const LLMSnippetInputSchema = z.strictObject({
  heroId: text,
  nicoId: text,
  originalText: text,
  originalPrompt: text,
  source: z.strictObject({ provider: text, model: text, promptVersion: text }),
});
export type LLMSnippetInput = z.infer<typeof LLMSnippetInputSchema>;
export const PreparedLLMSnippetSchema = LLMSnippetInputSchema.extend({
  id: text,
  preparedText: text,
  createdAt: z.number().int().nonnegative(),
  deletedAt: z.discriminatedUnion("_tag", [
    z.strictObject({ _tag: z.literal("None") }),
    z.strictObject({
      _tag: z.literal("Some"),
      value: z.number().int().nonnegative(),
    }),
  ]),
});
/** Raw evidence and preparation are separate; preparation never replaces the original. */
export type PreparedLLMSnippet = Readonly<
  z.infer<typeof PreparedLLMSnippetSchema>
>;
