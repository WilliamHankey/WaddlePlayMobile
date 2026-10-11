import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, radius, spacing } from "@/src/theme";

export function ActionButton({ label, onPress, secondary = false, danger = false, loading = false, disabled = false, testID }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean; loading?: boolean; disabled?: boolean; testID?: string }) {
  return <Pressable accessibilityRole="button" testID={testID} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, danger && { backgroundColor: colors.error }, (pressed || disabled || loading) && { opacity: 0.65 }]}>{loading ? <ActivityIndicator color={secondary ? colors.brandPrimary : colors.onBrandPrimary} /> : <Text style={[ui.buttonText, secondary && { color: colors.brandPrimary }]}>{label}</Text>}</Pressable>;
}

export function Sheet({ visible, title, description, onClose, children, centered = false }: { visible: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode; centered?: boolean }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={ui.overlay}><Pressable accessibilityLabel="Close dialog" style={StyleSheet.absoluteFill} onPress={onClose} /><View accessibilityViewIsModal style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl), maxHeight: "90%" }]}><View style={ui.handle} /><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={ui.sheetHeading}>{centered && <View style={{ width: 20 }} />}<Text style={[ui.heading, centered && { flex: 1, textAlign: "center", fontSize: 23 }]}>{title}</Text><Pressable accessibilityLabel="Close dialog" hitSlop={12} onPress={onClose}><Icon name="x" size={20} color={colors.muted} /></Pressable></View>{!!description && <Text style={[ui.description, centered && { textAlign: "center", fontSize: 13, marginBottom: 16 }]}>{description}</Text>}{children}</ScrollView></View></View></Modal>;
}

export function EmptyState({ icon = "search", title, description, action, onAction, secondary, onSecondary }: { icon?: React.ComponentProps<typeof Icon>["name"]; title: string; description: string; action?: string; onAction?: () => void; secondary?: string; onSecondary?: () => void }) {
  return <View style={ui.empty}><View style={ui.emptyIcon}><Icon name={icon} size={30} color={colors.brandPrimary} /></View><Text style={ui.emptyTitle}>{title}</Text><Text style={ui.emptyDescription}>{description}</Text>{action && onAction && <ActionButton label={action} onPress={onAction} />}{secondary && onSecondary && <ActionButton label={secondary} onPress={onSecondary} secondary />}</View>;
}

export function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <View accessibilityRole="alert" style={[ui.notice, error && { backgroundColor: "#FCEEEB" }]}><Icon name={error ? "alert-circle" : "check-circle"} size={18} color={error ? colors.error : colors.brandPrimary} /><Text style={[ui.noticeText, error && { color: colors.error }]}>{children}</Text></View>;
}

export function SkeletonCards() {
  return <View accessibilityLabel="Loading" style={{ gap: 16 }}>{[0, 1].map(i => <View key={i} style={ui.skeleton}><View style={ui.skeletonImage} />{["85%", "65%", "40%"].map((width, j) => <View key={j} style={[ui.skeletonLine, { width: width as `${number}%` }]} />)}</View>)}</View>;
}

export const ui = StyleSheet.create({
  heading: { fontFamily: fonts.display, fontSize: 25, color: colors.onSurface },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurface },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.muted, marginBottom: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onSurface, marginBottom: 8, marginTop: 16 },
  input: { fontFamily: fonts.body, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, padding: 14, minHeight: 48 },
  button: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.brandPrimary, padding: 12, alignItems: "center", justifyContent: "center", marginTop: 12, width: "100%" },
  buttonText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onBrandPrimary },
  secondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#18304466" },
  sheet: { backgroundColor: colors.surfaceSecondary, padding: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: 20 },
  sheetHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.onSurface, textAlign: "center" },
  emptyDescription: { fontFamily: fonts.body, color: colors.muted, textAlign: "center", lineHeight: 22, marginBottom: 12 },
  notice: { flexDirection: "row", gap: 10, alignItems: "center", padding: 14, backgroundColor: colors.surfaceTertiary, borderRadius: 13, marginBottom: 12 },
  noticeText: { flex: 1, fontFamily: fonts.body, color: colors.brandPrimary, lineHeight: 20 },
  skeleton: { padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surfaceSecondary, gap: 12 },
  skeletonImage: { height: 120, backgroundColor: colors.surfaceTertiary, borderRadius: 10 },
  skeletonLine: { height: 12, backgroundColor: colors.border, borderRadius: 4 },
});
