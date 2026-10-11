import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { NotificationsAPI } from "@/src/api";
import { EmptyState, Notice } from "@/src/components/screen-ui";

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
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["notifications"], queryFn: NotificationsAPI.list, refetchInterval: 30000 });
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
        {readMut.isError && <Notice error>Couldn’t mark notifications as read.</Notice>}
        {isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : isError ? <EmptyState title="Couldn’t load notifications" description="Check your connection." action="Try again" onAction={() => { void refetch(); }} /> : (data || []).length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bell-off" size={32} color={colors.brandPrimary} />
            <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          </View>
        ) : (data || []).map((n: any) => (
          <Pressable key={n.id} style={[styles.row, n.unread && styles.rowUnread]} testID={`notification-${n.id}`} onPress={() => { if (typeof n.route === "string" && /^(\/messages\/[\w-]+|\/playdate\/[\w-]+|\/verification)$/.test(n.route)) router.push(n.route as any); }}>
            <View style={[styles.icon, { backgroundColor: (ICON_TINT[n.kind] || colors.brandPrimary) }]}>
              <Icon name={n.kind === "messages" ? "message-circle" : n.kind === "playdates" ? "calendar" : "shield"} size={16} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{n.title}</Text>
              <Text style={styles.rowBody}>{n.body}</Text>
              <Text style={styles.rowAt}>{new Date(n.at).toLocaleString()}</Text>
            </View>
            {!!n.unread && <View style={styles.dot} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: "400", color: colors.onSurface },
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
