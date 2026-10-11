import { describe, expect, it } from "vitest";
import {
  NICO_THOUGHTS,
  simulateThought,
  type Hero,
  type ThoughtEnvironment,
} from "./thought";
import * as O from "../../foundation/src/option";
const hero: Hero = { role: "hero", relationship: "self", name: O.some("Alex") };
const environment: ThoughtEnvironment = {
  hero,
  people: [hero],
  realm: O.none(),
  quest: O.none(),
  needsRest: false,
  energy: "available",
  faith: "unspecified",
};
describe("Niko's concise thoughts", () => {
  it("offers twenty distinct curated thoughts and respects context", () => {
    expect(new Set(NICO_THOUGHTS.map((entry) => entry.id)).size).toBe(20);
    expect(simulateThought(environment, []).topic).toBe("orientation");
    expect(
      simulateThought({ ...environment, faith: "welcome" }, []).topic,
    ).toBe("faith");
    expect(
      simulateThought(
        {
          ...environment,
          people: [hero, { name: O.none(), relationship: "family" }],
        },
        [],
      ).topic,
    ).toBe("family");
    expect(
      simulateThought(
        { ...environment, quest: O.some({ title: "Walk", status: "active" }) },
        [],
      ).topic,
    ).toBe("quest");
    expect(
      simulateThought(
        {
          ...environment,
          quest: O.some({ title: "Walk", status: "active" }),
          needsRest: true,
        },
        [],
      ).topic,
    ).toBe("rest");
    expect(
      simulateThought({ ...environment, energy: "resting" }, []).topic,
    ).toBe("rest");
  });
  it("does not repeat within the relevant pool and restarts deterministically", () => {
    const history: string[] = [];
    for (let index = 0; index < 4; index++) {
      const result = simulateThought(environment, history);
      expect(history).not.toContain(result.id);
      history.push(result.id);
    }
    expect(simulateThought(environment, history).id).toBe(history[0]);
    history.push(simulateThought(environment, history).id);
    expect(simulateThought(environment, history).id).toBe(history[1]);
    expect(
      simulateThought({ ...environment, needsRest: true }, history).id,
    ).toBe("rest-1");
  });
  it("is deterministic and does not mutate the environment or history", () => {
    const before = JSON.stringify(environment);
    const history = Object.freeze(["orientation-1"]);
    expect(simulateThought(environment, history)).toEqual(
      simulateThought(environment, history),
    );
    expect(JSON.stringify(environment)).toBe(before);
    expect(history).toEqual(["orientation-1"]);
  });
});
