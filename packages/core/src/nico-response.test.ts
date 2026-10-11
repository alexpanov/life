import { describe, expect, it, vi } from "vitest";
import * as O from "../../foundation/src/option";
import {
  ask,
  heroLineClassification,
  initializeQuest,
  recommendedActionFor,
} from "./nico-response";

describe("hero line actions", () => {
  it("remembers a correction, notes praise, and asks when unsure", () => {
    expect(recommendedActionFor("correction")).toBe("remember");
    expect(recommendedActionFor("praise")).toBe("note-what-you-did");
    expect(recommendedActionFor("unsure")).toBe("ask");
    expect(
      heroLineClassification("correction", "don't call me brother"),
    ).toEqual({
      category: "correction",
      evidence: "don't call me brother",
      recommendedAction: "remember",
    });
    expect(heroLineClassification("praise", "awesome")).toEqual({
      category: "praise",
      evidence: "awesome",
      recommendedAction: "note-what-you-did",
    });
  });

  it("asks one short question for an unsure line", () => {
    const question = ask(heroLineClassification("unsure", "maybe later?"));
    expect(question).toBe("What did you mean by “maybe later”?");
    expect(question.match(/\?/g)).toEqual(["?"]);
  });
});

describe("initialize quest", () => {
  it("gives a rest quest a maps link and leaves the quest unchanged", () => {
    const quest = { title: " rest area ", detail: "bring a pillow" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("no network"));
    const action = initializeQuest(quest);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(quest).toEqual({ title: " rest area ", detail: "bring a pillow" });
    expect(action).toEqual(
      O.some({
        kind: "map-search",
        href: "https://www.google.com/maps/search/?api=1&query=rest%20area",
      }),
    );
    expect(initializeQuest(quest)).toEqual(action);
  });

  it("uses sleep words from the detail and ignores other quests", () => {
    expect(initializeQuest({ title: "Tonight", detail: "sleep" })).toEqual(
      O.some({
        kind: "map-search",
        href: "https://www.google.com/maps/search/?api=1&query=sleep",
      }),
    );
    expect(
      initializeQuest({ title: "Finish the report", detail: "Write it" }),
    ).toEqual(O.none());
    expect(initializeQuest({ title: "restaurant", detail: "dinner" })).toEqual(
      O.none(),
    );
    const encoded = initializeQuest({
      title: "rest area&destination=hotel",
      detail: "",
    });
    expect(encoded._tag).toBe("Some");
    if (encoded._tag === "Some")
      expect(encoded.value.href).toBe(
        "https://www.google.com/maps/search/?api=1&query=rest%20area%26destination%3Dhotel",
      );
  });
});
