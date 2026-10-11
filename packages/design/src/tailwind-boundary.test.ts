import { describe, expect, it } from "vitest";
import {
  isTailwindImport,
  tailwindClassTokens,
  tailwindStylesheetIssue,
} from "./tailwind-boundary.mjs";

describe("tailwind boundary", () => {
  it("flags utility classes and leaves screen classes alone", () => {
    expect(tailwindClassTokens("my-4 text-xl flex")).toEqual([
      "my-4",
      "text-xl",
      "flex",
    ]);
    expect(tailwindClassTokens("md:grid-cols-2 hover:bg-lime-100")).toEqual([
      "md:grid-cols-2",
      "hover:bg-lime-100",
    ]);
    expect(
      tailwindClassTokens("text-[var(--paint-danger)] -m-2"),
    ).toEqual(["text-[var(--paint-danger)]", "-m-2"]);
    expect(
      tailwindClassTokens(
        "type-h1 type-body type-label type-h2 nico-fixed focus-screen app-shell card-grid stack-gap alarm-copy",
      ),
    ).toEqual([]);
  });

  it("flags tailwind imports and leaves the design package path alone", () => {
    expect(isTailwindImport("tailwindcss")).toBe(true);
    expect(isTailwindImport("@tailwindcss/vite")).toBe(true);
    expect(isTailwindImport("tailwind-merge")).toBe(true);
    expect(isTailwindImport("lucide-react")).toBe(false);
    expect(isTailwindImport("./packages/design/src/vite")).toBe(false);
  });

  it("flags tailwind stylesheet directives", () => {
    expect(tailwindStylesheetIssue('@import "tailwindcss";')).toBe(
      '@import "tailwindcss"',
    );
    expect(tailwindStylesheetIssue("@theme {\n}")).toBe("@theme");
    expect(
      tailwindStylesheetIssue(
        '@import "../../../packages/design/src/tailwind.css";\n@import "../../../packages/design/src/typography.css";',
      ),
    ).toBeUndefined();
    expect(
      tailwindStylesheetIssue(".dialog-surface { position: fixed; }"),
    ).toBeUndefined();
  });
});
