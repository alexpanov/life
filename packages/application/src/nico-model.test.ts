import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as O from "../../foundation/src/option";
import {
  NIKO_INTRODUCTION,
  NIKO_LAST_NAME_REFUSAL,
  mockNicoLayer,
  nicoReplyRoutine,
  simulateNicoProposal,
  type NicoChatRequest,
} from "./nico-model";
import { getSidekickContext, newGame } from "../../core/src/index";

const request = (chat: string): NicoChatRequest => ({
  surface: "web",
  chat,
  system: { voice: "Niko", instructions: "Stay brief" },
  routineSchema: {},
  powerup: O.none(),
  heroName: O.none(),
  targets: [],
  target: O.none(),
  storyChoices: [],
});
const said = (chat: string) => {
  const proposal = simulateNicoProposal(request(chat));
  expect(proposal).toEqual({
    version: 1,
    kind: "say",
    text: NIKO_LAST_NAME_REFUSAL,
  });
  expect(JSON.stringify(proposal)).not.toContain("Gonzalez");
};

describe("Niko withholds his last name", () => {
  it("introduces himself as Niko", async () => {
    const state = newGame({
      now: 1800000000000,
      eventId: "meet",
      localDay: "2027-01-15",
    });
    const text = await Effect.runPromise(
      nicoReplyRoutine(getSidekickContext(state, 1800000000000), "meet").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(text).toBe(NIKO_INTRODUCTION);
    expect(text).not.toContain("Gonzalez");
  });
  it("refuses a last name, a surname, and a direct guess", () => {
    said("What is your last name?");
    said("What's your surname?");
    said("Tell me your full name.");
    said("Are you Gonzalez?");
  });
  it("gives his first name when asked who he is", () => {
    expect(simulateNicoProposal(request("What's your name?"))).toEqual({
      version: 1,
      kind: "say",
      text: "I’m Niko.",
    });
  });
});
