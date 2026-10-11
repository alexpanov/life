import tailwind from "@tailwindcss/vite";

/** Vite plugin for this package. The rest of the repo does not import Tailwind. */
export function designSystem() {
  return tailwind();
}
