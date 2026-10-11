import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../../packages/design/src/tokens";
import { nativeTypeface } from "../../packages/design/src/typography";

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
    fontFamily: nativeTypeface.display,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  coin: { color: tokens.color.action },
  label: {
    fontFamily: nativeTypeface.sansBold,
    fontSize: 13,
    letterSpacing: 0.6,
    color: tokens.color.signal,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: tokens.color.border,
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: {
    color: tokens.color.muted,
    fontFamily: nativeTypeface.sans,
    fontSize: 13,
  },
  tabActive: {
    color: tokens.color.signal,
    fontFamily: nativeTypeface.sansBold,
  },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
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
    borderColor: tokens.color.companionEdge,
  },
  notice: {
    color: tokens.color.signal,
    fontFamily: nativeTypeface.text,
    fontSize: 16,
    lineHeight: 24,
  },
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
    fontFamily: nativeTypeface.sansBold,
    fontSize: 16,
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
    fontFamily: nativeTypeface.text,
    fontSize: 17,
    minHeight: 54,
    backgroundColor: tokens.color.surface,
  },
  overlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim,
    justifyContent: "center",
    padding: 24,
  },
});
