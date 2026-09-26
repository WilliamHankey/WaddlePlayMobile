import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { NotificationsAPI } from "@/src/api";

const ICON_TINT: Record<string, string> = {
  playdate_join: colors.brandPrimary,
  match: colors.brandSecondary,
  forum: colors.brandTertiary,
  safety: colors.brandPrimary,
  resource: colors.surfaceInverse,
};

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: NotificationsAPI.list });
  const readMut = useMutation({ mutationFn: NotificationsAPI.readAll, onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="notifications-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={() => readMut.mutate()} testID="notifications-read-all"><Text style={styles.markAll}>Mark all read</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
        {isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : (data || []).length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bell-off" size={32} color={colors.brandPrimary} />
            <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          </View>
        ) : (data || []).map((n: any) => (
          <View key={n.id} style={[styles.row, n.unread && styles.rowUnread]} testID={`notification-${n.id}`}>
            <View style={[styles.icon, { backgroundColor: (ICON_TINT[n.kind] || colors.brandPrimary) }]}>
              <Icon name={n.icon} size={16} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{n.title}</Text>
              <Text style={styles.rowBody}>{n.body}</Text>
              <Text style={styles.rowAt}>{n.at}</Text>
            </View>
            {n.unread && <View style={styles.dot} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  markAll: { color: colors.brandPrimary, fontWeight: "600", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rowUnread: { borderColor: colors.brandPrimary },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontWeight: "700", color: colors.onSurface },
  rowBody: { color: colors.onSurface, marginTop: 2, fontSize: 13, lineHeight: 18 },
  rowAt: { color: colors.muted, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandTertiary, marginTop: 6 },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg },
  emptyTitle: { fontWeight: "700", color: colors.onSurface },
});
