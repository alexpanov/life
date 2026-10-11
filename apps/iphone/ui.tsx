import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../../packages/design/src/tokens";

export function Action({
  children,
  onPress,
  subdued = false,
}: {
  children: string;
  onPress: () => void;
  subdued?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        subdued && styles.subdued,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, subdued && styles.subduedText]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Panel({
  children,
  companion = false,
}: {
  children: ReactNode;
  companion?: boolean;
}) {
  return (
    <View style={[styles.panel, companion && styles.companion]}>
      {children}
    </View>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.background },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: tokens.color.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
  },
  coin: { color: tokens.color.action },
  label: {
    fontFamily: "Menlo",
    fontSize: 10,
    letterSpacing: 1.2,
    color: tokens.color.signal,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: tokens.color.border,
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: { color: tokens.color.muted, fontSize: 12 },
  tabActive: { color: tokens.color.signal, fontWeight: "700" },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  hero: {
    color: tokens.color.text,
    fontSize: 37,
    fontWeight: "700",
    letterSpacing: -1,
    lineHeight: 43,
  },
  panel: {
    backgroundColor: tokens.color.surface,
    padding: 18,
    borderRadius: tokens.radius.panel,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: 12,
  },
  companion: {
    backgroundColor: tokens.color.companionSurface,
    borderColor: "#494034",
  },
  nikoLabel: {
    color: tokens.color.companion,
    fontFamily: "Menlo",
    fontSize: 10,
    letterSpacing: 1,
  },
  niko: {
    color: tokens.color.companion,
    fontFamily: "Georgia",
    fontSize: 23,
    lineHeight: 31,
  },
  heading: { color: tokens.color.text, fontSize: 21, fontWeight: "600" },
  body: { color: tokens.color.muted, fontSize: 16, lineHeight: 24 },
  notice: { color: tokens.color.signal, fontSize: 13, lineHeight: 20 },
  button: {
    backgroundColor: tokens.color.action,
    borderRadius: tokens.radius.control,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: tokens.color.background,
    fontWeight: "700",
    fontSize: 15,
  },
  subdued: {
    backgroundColor: tokens.color.raised,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  subduedText: { color: tokens.color.text },
  pressed: { opacity: 0.7 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    color: tokens.color.text,
    padding: 16,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.control,
    fontSize: 17,
    minHeight: 54,
    backgroundColor: tokens.color.surface,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "center",
    padding: 24,
  },
});
