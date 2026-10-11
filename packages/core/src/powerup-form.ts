import type { FormDefinition } from "./forms";
import { powerupTemplateSchema } from "./powerups";
import * as E from "../../foundation/src/either";
import { z } from "zod";

const schema = powerupTemplateSchema.pick({
  name: true,
  description: true,
  context: true,
  instructions: true,
});
export type PowerupFormValues = z.infer<typeof schema>;
export const powerupForm: FormDefinition<PowerupFormValues> = {
  id: "nico.powerup.create",
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
