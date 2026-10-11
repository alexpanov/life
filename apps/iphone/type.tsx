import type { ReactNode } from "react";
import { Text } from "react-native";
import {
  nativeFace,
  typeColor,
  typeScale,
  type TypeRole,
} from "../../packages/design/src/typography";

type Marks = {
  b?: boolean;
  i?: boolean;
  voice?: "companion";
  children: ReactNode;
};

function faceColor(role: TypeRole, voice: Marks["voice"]) {
  if (voice === "companion") return typeColor.companion;
  if (role === "body") return typeColor.reading;
  if (role === "label") return typeColor.label;
  return typeColor.ink;
}

function Line({
  role,
  b = false,
  i = false,
  voice,
  children,
}: Marks & { role: TypeRole }) {
  const style = typeScale[role];
  const level = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5 } as const;
  const heading = role === "label" || role === "body" ? null : level[role];
  return (
    <Text
      accessibilityRole={heading == null ? undefined : "header"}
      aria-level={heading ?? undefined}
      style={{
        fontFamily: nativeFace(role, b, i),
        fontSize: style.px,
        lineHeight: style.line,
        color: faceColor(role, voice),
      }}
    >
      {children}
    </Text>
  );
}

export function H1(props: Marks) {
  return <Line role="h1" {...props} />;
}
export function H2(props: Marks) {
  return <Line role="h2" {...props} />;
}
export function H3(props: Marks) {
  return <Line role="h3" {...props} />;
}
export function H4(props: Marks) {
  return <Line role="h4" {...props} />;
}
export function H5(props: Marks) {
  return <Line role="h5" {...props} />;
}
export function Body(props: Marks) {
  return <Line role="body" {...props} />;
}
export function Label(props: Marks) {
  return <Line role="label" {...props} />;
}
