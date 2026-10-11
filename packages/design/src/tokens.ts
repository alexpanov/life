import { palette } from "./palette";

/** Stable design language; pages and controls are replaceable compositions. */
export const tokens = {
  color: {
    ...palette,
    scrim: `${palette.background}cc`,
  },
  radius: { control: 3, panel: 12 },
  spacing: { small: 8, base: 16, section: 24 },
  motion: { fast: 140, scene: 230 },
} as const;
export type MessageSource = "system" | "niko" | "dispatch";
export const senderLabels: Record<MessageSource, string> = {
  system: "QUESTOS / SYSTEM",
  niko: "NIKO / YOUR SIDEKICK",
  dispatch: "GAME DISPATCH",
};
