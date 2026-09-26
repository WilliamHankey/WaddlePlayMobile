import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";

export default function Messages() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.card}>
          <View style={styles.icon}><Icon name="message-circle" size={22} color={colors.onBrandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Chat unlocks after your first playdate</Text>
            <Text style={styles.cardSub}>To keep families safe, direct messages open only after both parents accept a playdate.</Text>
          </View>
        </View>
        <Text style={styles.section}>Playdate updates</Text>
        <View style={styles.emptyBox}>
          <Icon name="inbox" size={32} color={colors.brandPrimary} />
          <Text style={styles.emptyTitle}>No new messages</Text>
          <Text style={styles.emptyText}>Request to join a playdate to get started.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 30, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md, marginBottom: spacing.lg },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "700", color: colors.onSurface },
  cardSub: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  section: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  emptyBox: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { color: colors.muted, textAlign: "center" },
});
