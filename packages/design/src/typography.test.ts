import { describe, expect, it } from "vitest";
import {
  headingStepsDown,
  nativeFace,
  typeface,
  typeScale,
} from "./typography";

describe("type scale", () => {
  it("steps headers down and keeps body readable", () => {
    expect(headingStepsDown()).toBe(true);
    expect(typeScale.body.px).toBeGreaterThanOrEqual(16);
    expect(typeScale.h1.face).toBe("display");
    expect(typeScale.body.face).toBe("text");
    expect(typeScale.label.face).toBe("sans");
  });

  it("names the three faces", () => {
    expect(typeface.display).toBe("Libre Bodoni");
    expect(typeface.text).toBe("Libre Baskerville");
    expect(typeface.sans).toBe("IBM Plex Sans");
  });

  it("picks a heavier or italic file when marked", () => {
    expect(nativeFace("body", false, false)).toBe(
      "LibreBaskerville_400Regular",
    );
    expect(nativeFace("body", true, false)).toBe("LibreBaskerville_700Bold");
    expect(nativeFace("body", false, true)).toBe(
      "LibreBaskerville_400Regular_Italic",
    );
    expect(nativeFace("h1", false, false)).toBe("LibreBodoni_500Medium");
    expect(nativeFace("h4", true, false)).toBe("LibreBodoni_700Bold");
    expect(nativeFace("label", true, false)).toBe("IBMPlexSans_600SemiBold");
  });
});
