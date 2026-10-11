/** Stable design language; pages and controls are replaceable compositions. */
export const tokens = {
  color: {
    background: "#05090e",
    surface: "#0c141d",
    raised: "#132330",
    text: "#e6edf1",
    reading: "#d3e0e6",
    muted: "#91a5af",
    border: "#263b48",
    signal: "#75e2f0",
    action: "#b7ca8d",
    companion: "#f1dcc0",
    companionSurface: "#29251e",
    danger: "#e98479",
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
