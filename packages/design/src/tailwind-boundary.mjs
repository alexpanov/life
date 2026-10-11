const exact = new Set([
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "block",
  "inline-block",
  "inline",
  "hidden",
  "contents",
  "fixed",
  "absolute",
  "relative",
  "sticky",
  "static",
  "border",
  "rounded",
  "shadow",
  "outline",
  "truncate",
  "uppercase",
  "lowercase",
  "italic",
  "underline",
  "antialiased",
  "sr-only",
  "container",
  "grow",
  "shrink",
  "transform",
  "transition",
  "isolate",
]);

const prefix =
  /^(?:m|p|mx|my|mt|mr|mb|ml|ms|me|px|py|pt|pr|pb|pl|ps|pe|gap|inset|top|right|bottom|left|z|w|h|size|basis|order|opacity|leading|tracking|columns|aspect|cursor|object|overflow|overscroll|whitespace|break|content|items|justify|self|place|align|list|scroll|snap|touch|select|pointer-events|font|text|bg|border|rounded|shadow|ring|outline|fill|stroke|from|via|to|placeholder|decoration|divide|underline|line-clamp|transition|duration|ease|delay|animate|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|backdrop|mix-blend|origin|scale|rotate|skew|translate|col-span|row-span|grid-cols|grid-rows|auto-cols|auto-rows|min-w|min-h|max-w|max-h|space-x|space-y)-/;

const stylesheet =
  /@import\s+["']tailwindcss["']|@import\s+["']@tailwindcss\/|@theme\b|@apply\b|@tailwind\b|@source\b|@utility\b|@variant\b|@custom-variant\b|@config\b/;

function baseToken(token) {
  let value = token.trim();
  if (value.startsWith("!")) value = value.slice(1);
  while (value.includes(":")) value = value.slice(value.indexOf(":") + 1);
  if (value.startsWith("!")) value = value.slice(1);
  if (value.startsWith("-")) value = value.slice(1);
  return value;
}

export function isTailwindToken(token) {
  if (!token || token.includes("[") || token.includes("]"))
    return Boolean(token && (token.includes("[") || token.includes("]")));
  const value = baseToken(token);
  if (!value) return false;
  return exact.has(value) || prefix.test(value);
}

export function isTailwindImport(source) {
  return (
    source === "tailwindcss" ||
    source.startsWith("tailwindcss/") ||
    source === "tailwind-merge" ||
    source.startsWith("tailwind-merge/") ||
    source.startsWith("@tailwindcss/")
  );
}

export function tailwindClassTokens(className) {
  return className.split(/\s+/).filter((token) => isTailwindToken(token));
}

export function tailwindStylesheetIssue(source) {
  return source.match(stylesheet)?.[0];
}
