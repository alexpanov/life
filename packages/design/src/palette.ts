/** Night instrument panel, written in Oklch.
 * Ship 206.5° is the cyan signal. The hull, the type, and the door are steps of that hue.
 * Order 122.3° is the olive action.
 * Warm 75.1° is Niko. Dispatch is a stronger step of the same warm.
 * Alarm 27.2° is danger.
 * Lightness and chroma are Oklch. Hue is degrees.
 */
const shipHue = 206.5;
const orderHue = 122.3;
const warmHue = 75.1;
const alarmHue = 27.2;

function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const long = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mid = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const short = lightness - 0.0894841775 * a - 1.291485548 * b;
  const longCube = long ** 3;
  const midCube = mid ** 3;
  const shortCube = short ** 3;
  const red =
    4.0767416621 * longCube - 3.3077115913 * midCube + 0.2309699292 * shortCube;
  const green =
    -1.2684380046 * longCube +
    2.6097574011 * midCube -
    0.3413193965 * shortCube;
  const blue =
    -0.0041960863 * longCube - 0.7034186147 * midCube + 1.707614701 * shortCube;
  const channel = (linear: number) => {
    const shown =
      linear <= 0.0031308
        ? 12.92 * linear
        : 1.055 * linear ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, shown)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export const palette = {
  background: oklchToHex(0.14, 0.015, shipHue),
  surface: oklchToHex(0.19, 0.022, shipHue),
  raised: oklchToHex(0.25, 0.03, shipHue),
  border: oklchToHex(0.35, 0.035, shipHue),
  muted: oklchToHex(0.74, 0.028, shipHue),
  text: oklchToHex(0.94, 0.012, shipHue),
  signal: oklchToHex(0.853, 0.102, shipHue),
  action: oklchToHex(0.81, 0.084, orderHue),
  actionSurface: oklchToHex(0.26, 0.03, orderHue),
  companion: oklchToHex(0.904, 0.044, warmHue),
  companionSurface: oklchToHex(0.266, 0.03, warmHue),
  companionEdge: oklchToHex(0.644, 0.075, warmHue),
  dispatch: oklchToHex(0.81, 0.1, warmHue),
  danger: oklchToHex(0.74, 0.12, alarmHue),
  dangerSurface: oklchToHex(0.26, 0.03, alarmHue),
  door: oklchToHex(0.906, 0.053, shipHue),
  doorInk: oklchToHex(0.24, 0.032, shipHue),
} as const;

export function paintDeclarations(): string {
  return Object.entries(palette)
    .map(([name, hex]) => {
      const property = name.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      return `--paint-${property}: ${hex};`;
    })
    .join("\n");
}

export function hueDegrees(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const linear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const red = linear(((value >> 16) & 255) / 255);
  const green = linear(((value >> 8) & 255) / 255);
  const blue = linear((value & 255) / 255);
  const long = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const mid = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const short = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  const a = 1.9779984951 * long - 2.428592205 * mid + 0.4505937099 * short;
  const b = 0.0259040371 * long + 0.7827717662 * mid - 0.808675766 * short;
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return hue < 0 ? hue + 360 : hue;
}
