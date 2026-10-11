import { expect, it } from "vitest";
import {
  nicoChatForm,
  nicoFeedbackForm,
  nicoTraitForm,
  NICO_FORM_DEFINITIONS,
} from "./forms";
it("forms have stable identities and normalize successful values", () => {
  expect(NICO_FORM_DEFINITIONS.map((form) => [form.id, form.version])).toEqual([
    ["nico.chat", 1],
    ["nico.feedback", 1],
    ["nico.trait", 1],
  ]);
  expect(nicoChatForm.parse({ chat: "  Help me rest  " })).toEqual({
    _tag: "Right",
    right: { chat: "Help me rest" },
  });
  expect(nicoFeedbackForm.parse({ reason: "other", note: "" })._tag).toBe(
    "Right",
  );
});
it("rejects empty, oversized and malformed submissions without mutating input", () => {
  const input = Object.freeze({ trait: "   " });
  expect(nicoTraitForm.parse(input)._tag).toBe("Left");
  expect(input.trait).toBe("   ");
  expect(nicoTraitForm.parse({ trait: "a".repeat(201) })._tag).toBe("Left");
  expect(nicoChatForm.parse({ chat: "a".repeat(2001) })._tag).toBe("Left");
  expect(nicoFeedbackForm.parse({ reason: "made-up", note: "" })._tag).toBe(
    "Left",
  );
  expect(
    nicoFeedbackForm.parse({ reason: "other", note: "a".repeat(601) })._tag,
  ).toBe("Left");
  expect(nicoChatForm.parse({ chat: "Hello", heroId: "foreign" })._tag).toBe(
    "Left",
  );
});
