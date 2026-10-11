import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hueDegrees, paintDeclarations, palette } from "./palette";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const styles = readFileSync(join(root, "apps/web/src/styles.css"), "utf8");
const notices = readFileSync(
  join(root, "apps/web/src/notifications.css"),
  "utf8",
);

function apart(first: number, second: number): number {
  const gap = Math.abs(first - second);
  return Math.min(gap, 360 - gap);
}

function contrast(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    const linear = (channel: number) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    const red = linear(((value >> 16) & 255) / 255);
    const green = linear(((value >> 8) & 255) / 255);
    const blue = linear((value & 255) / 255);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("instrument palette", () => {
  it("keeps the measured instrument colors", () => {
    expect(palette.signal).toBe("#75e2f0");
    expect(palette.action).toBe("#b7ca8d");
    expect(palette.companion).toBe("#f1dcc0");
    expect(palette.companionEdge).toBe("#a88758");
  });

  it("keeps each voice on one hue", () => {
    const hue = (name: keyof typeof palette) => hueDegrees(palette[name]);
    for (const name of ["raised", "border", "door", "doorInk"] as const)
      expect(apart(hue(name), hue("signal"))).toBeLessThan(2);
    expect(apart(hue("actionSurface"), hue("action"))).toBeLessThan(2);
    for (const name of ["companionEdge", "dispatch"] as const)
      expect(apart(hue(name), hue("companion"))).toBeLessThan(2);
    expect(apart(hue("companionSurface"), hue("companion"))).toBeLessThan(4);
    expect(apart(hue("dangerSurface"), hue("danger"))).toBeLessThan(2);
    expect(apart(hue("signal"), hue("action"))).toBeGreaterThan(40);
    expect(apart(hue("action"), hue("companion"))).toBeGreaterThan(40);
    expect(apart(hue("companion"), hue("danger"))).toBeGreaterThan(40);
  });

  it("keeps text readable on its ground", () => {
    expect(contrast(palette.text, palette.background)).toBeGreaterThan(7);
    expect(contrast(palette.reading, palette.background)).toBeGreaterThan(7);
    expect(contrast(palette.muted, palette.background)).toBeGreaterThan(4.5);
    expect(contrast(palette.signal, palette.background)).toBeGreaterThan(4.5);
    expect(contrast(palette.action, palette.background)).toBeGreaterThan(4.5);
    expect(contrast(palette.dispatch, palette.background)).toBeGreaterThan(4.5);
    expect(contrast(palette.danger, palette.dangerSurface)).toBeGreaterThan(
      4.5,
    );
    expect(
      contrast(palette.companion, palette.companionSurface),
    ).toBeGreaterThan(4.5);
    expect(contrast(palette.background, palette.action)).toBeGreaterThan(4.5);
    expect(contrast(palette.doorInk, palette.door)).toBeGreaterThan(7);
  });

  it("lets the web use only these paints", () => {
    const allowed = new Set(
      Object.values(palette).map((hex) => hex.toLowerCase()),
    );
    const found = styles.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    expect(found.length).toBeGreaterThan(0);
    for (const hex of found) expect(allowed.has(hex.toLowerCase())).toBe(true);
    for (const line of paintDeclarations().split("\n"))
      expect(styles).toContain(line);
    expect(notices).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
