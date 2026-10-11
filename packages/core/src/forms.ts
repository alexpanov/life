import { z } from "zod";
import * as E from "../../foundation/src/either";

export type FormIssue = Readonly<{ field: string; message: string }>;
export type FormDefinition<T> = Readonly<{
  id: string;
  version: 1;
  schema: z.ZodType<T>;
  parse: (input: unknown) => E.Either<readonly FormIssue[], T>;
}>;
function defineForm<T>(id: string, schema: z.ZodType<T>): FormDefinition<T> {
  return {
    id,
    version: 1,
    schema,
    parse(input) {
      const result = schema.safeParse(input);
      return result.success
        ? E.right(result.data)
        : E.left(
            result.error.issues.map((issue) => ({
              field: issue.path.map(String).join("."),
              message: issue.message,
            })),
          );
    },
  };
}

export const nicoChatForm = defineForm(
  "nico.chat",
  z.strictObject({
    chat: z
      .string()
      .trim()
      .min(1, "Tell Niko what’s on your mind.")
      .max(2000, "Keep your message within 2,000 characters."),
  }),
);
export const nicoFeedbackForm = defineForm(
  "nico.feedback",
  z.strictObject({
    reason: z.enum(["not-for-me", "not-interesting", "repetitive", "other"]),
    note: z.string().trim().max(600, "Keep your note within 600 characters."),
  }),
);
export const nicoTraitForm = defineForm(
  "nico.trait",
  z.strictObject({
    trait: z
      .string()
      .trim()
      .min(1, "Describe how you want Niko to help.")
      .max(200, "Keep this within 200 characters."),
  }),
);
export type NicoChatValues = z.infer<typeof nicoChatForm.schema>;
export type NicoFeedbackValues = z.infer<typeof nicoFeedbackForm.schema>;
export type NicoTraitValues = z.infer<typeof nicoTraitForm.schema>;

/** Portable form catalog for web, iPhone and future interfaces. */
export const NICO_FORM_DEFINITIONS = [
  nicoChatForm,
  nicoFeedbackForm,
  nicoTraitForm,
] as const;
