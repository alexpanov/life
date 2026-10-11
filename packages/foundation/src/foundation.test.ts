import { describe, it, expect, vi } from "vitest";
import * as O from "./option";
import * as E from "./either";
describe("Option laws and boundaries", () => {
  it.each([null, undefined])("represents missing boundary values %s", (value) =>
    expect(O.fromNullable(value)).toEqual(O.none()),
  );
  it.each([0, false, ""])("preserves legitimate falsy values %s", (value) =>
    expect(O.fromNullable(value)).toEqual(O.some(value)),
  );
  it.each([O.none<number>(), O.some(3)])(
    "obeys map identity and composition",
    (value) => {
      expect(O.map(value, (x) => x)).toEqual(value);
      expect(
        O.map(
          O.map(value, (x) => x + 1),
          (x) => x * 2,
        ),
      ).toEqual(O.map(value, (x) => (x + 1) * 2));
    },
  );
  it("obeys flatMap identity and associativity", () => {
    const f = (x: number) => O.some(x + 1),
      g = (x: number) => O.some(x * 2),
      m = O.some(4);
    expect(O.flatMap(m, O.some)).toEqual(m);
    expect(O.flatMap(O.some(4), f)).toEqual(f(4));
    expect(O.flatMap(O.flatMap(m, f), g)).toEqual(
      O.flatMap(m, (x) => O.flatMap(f(x), g)),
    );
  });
  it("never evaluates missing branches", () => {
    const action = vi.fn();
    expect(O.map(O.none(), action)).toEqual(O.none());
    expect(O.flatMap(O.none(), action)).toEqual(O.none());
    expect(action).not.toHaveBeenCalled();
  });
  it("evaluates fallbacks lazily", () => {
    const fallback = vi.fn(() => 7);
    expect(O.getOrElse(O.some(0), fallback)).toBe(0);
    expect(fallback).not.toHaveBeenCalled();
    expect(O.getOrElse(O.none(), fallback)).toBe(7);
  });
  it("sequences all values or returns explicit absence", () => {
    expect(O.all([O.some(1), O.some(2)])).toEqual(O.some([1, 2]));
    expect(O.all([O.some(1), O.none()])).toEqual(O.none());
    expect(O.all([])).toEqual(O.some([]));
  });
  it("filters without inventing a value", () => {
    expect(O.filter(O.some(2), (x) => x > 1)).toEqual(O.some(2));
    expect(O.filter(O.some(2), (x) => x > 3)).toEqual(O.none());
  });
});
describe("Either laws and error ownership", () => {
  it.each([E.left("failure"), E.right(5)])("obeys map identity", (value) =>
    expect(E.map(value, (x) => x)).toEqual(value),
  );
  it("short circuits failures", () => {
    const f = vi.fn();
    expect(E.flatMap(E.left("failed"), f)).toEqual(E.left("failed"));
    expect(f).not.toHaveBeenCalled();
  });
  it("composes successful computations", () => {
    const f = (x: number) => E.right(x + 1),
      g = (x: number) => E.right(x * 2),
      m = E.right(4);
    expect(E.flatMap(E.flatMap(m, f), g)).toEqual(
      E.flatMap(m, (x) => E.flatMap(f(x), g)),
    );
  });
  it("maps only the error branch", () => {
    expect(E.mapLeft(E.left("bad"), (s) => s.length)).toEqual(E.left(3));
    expect(E.mapLeft(E.right(4), () => 0)).toEqual(E.right(4));
  });
  it("captures exceptions in an explicit error type", () => {
    expect(
      E.tryCatch(
        () => JSON.parse("{"),
        () => ({ kind: "invalid-json" }),
      ),
    ).toEqual(E.left({ kind: "invalid-json" }));
    expect(
      E.tryCatch(
        () => 42,
        () => 0,
      ),
    ).toEqual(E.right(42));
  });
});
