import { tokens } from "./tokens";

/** Sharp faces. Sans means without serifs: flat terminals, not round ones. */
export const typeface = {
  display: "Libre Bodoni",
  text: "Libre Baskerville",
  sans: "IBM Plex Sans",
} as const;

/** File names registered on iPhone. Keys match the loaded font files. */
export const nativeTypeface = {
  displayMedium: "LibreBodoni_500Medium",
  displayMediumItalic: "LibreBodoni_500Medium_Italic",
  display: "LibreBodoni_600SemiBold",
  displayBold: "LibreBodoni_700Bold",
  displayItalic: "LibreBodoni_600SemiBold_Italic",
  displayBoldItalic: "LibreBodoni_700Bold_Italic",
  text: "LibreBaskerville_400Regular",
  textItalic: "LibreBaskerville_400Regular_Italic",
  textBold: "LibreBaskerville_700Bold",
  textBoldItalic: "LibreBaskerville_700Bold_Italic",
  sans: "IBMPlexSans_400Regular",
  sansItalic: "IBMPlexSans_400Regular_Italic",
  sansBold: "IBMPlexSans_600SemiBold",
} as const;

export type TypeRole = "h1" | "h2" | "h3" | "h4" | "h5" | "body" | "label";
export type TypeFace = "display" | "text" | "sans";

export interface TypeStyle {
  readonly face: TypeFace;
  readonly px: number;
  readonly line: number;
  readonly weight: 400 | 500 | 600 | 700;
}

/**
 * Phone sizes. Web headers grow with the viewport; see typography.css.
 * Header one is largest. Header five is the smallest header.
 * Body stays at least 16.
 */
export const typeScale: Record<TypeRole, TypeStyle> = {
  h1: { face: "display", px: 34, line: 37, weight: 500 },
  h2: { face: "display", px: 26, line: 30, weight: 600 },
  h3: { face: "display", px: 22, line: 28, weight: 600 },
  h4: { face: "display", px: 18, line: 24, weight: 600 },
  h5: { face: "display", px: 16, line: 22, weight: 700 },
  body: { face: "text", px: 18, line: 30, weight: 400 },
  label: { face: "sans", px: 13, line: 18, weight: 600 },
};

export const typeColor = {
  ink: tokens.color.text,
  reading: tokens.color.reading,
  companion: tokens.color.companion,
  label: tokens.color.muted,
} as const;

const headingRoles = ["h1", "h2", "h3", "h4", "h5"] as const;

export function nativeFace(
  role: TypeRole,
  bold: boolean,
  italic: boolean,
): string {
  const style = typeScale[role];
  if (style.face === "display") {
    const heavy = bold || style.weight >= 700;
    const medium = !bold && style.weight <= 500;
    if (italic && heavy) return nativeTypeface.displayBoldItalic;
    if (italic && medium) return nativeTypeface.displayMediumItalic;
    if (italic) return nativeTypeface.displayItalic;
    if (medium) return nativeTypeface.displayMedium;
    if (heavy) return nativeTypeface.displayBold;
    return nativeTypeface.display;
  }
  if (style.face === "text") {
    if (italic && bold) return nativeTypeface.textBoldItalic;
    if (italic) return nativeTypeface.textItalic;
    if (bold) return nativeTypeface.textBold;
    return nativeTypeface.text;
  }
  if (italic) return nativeTypeface.sansItalic;
  return bold ? nativeTypeface.sansBold : nativeTypeface.sans;
}

export function headingStepsDown(): boolean {
  let previous = Number.POSITIVE_INFINITY;
  for (const role of headingRoles) {
    const size = typeScale[role].px;
    if (size >= previous) return false;
    previous = size;
  }
  return typeScale.body.px >= 16 && typeScale.h5.px >= 16;
}
