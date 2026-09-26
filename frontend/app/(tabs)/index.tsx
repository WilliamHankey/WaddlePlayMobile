import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { PlaydatesAPI } from "@/src/api";
import { PlaydateCard } from "@/src/components/playdate-card";
import { TopBar } from "@/src/components/top-bar";
import { useAuth } from "@/src/auth-context";

const QUICK_NAV = [
  { id: "forum", label: "Forum", icon: "message-square" as const, href: "/forum", bg: colors.brandPrimary, fg: colors.onBrandPrimary },
  { id: "resources", label: "Resources", icon: "book-open" as const, href: "/resources", bg: colors.brandSecondary, fg: colors.onBrandSecondary },
  { id: "playdates", label: "Playdates", icon: "calendar" as const, href: "/(tabs)/playdates", bg: colors.brandTertiary, fg: colors.onBrandTertiary },
  { id: "explore", label: "Explore", icon: "map" as const, href: "/(tabs)/explore", bg: colors.surfaceInverse, fg: colors.onSurfaceInverse },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["playdates"], queryFn: () => PlaydatesAPI.list() });
  const joinMut = useMutation({ mutationFn: (id: string) => PlaydatesAPI.join(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["playdates"] }) });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);
  const playdates = data || [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hello} testID="home-greeting">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</Text>
        <Text style={styles.tagline}>Find the perfect playdate for your little one</Text>

        <View style={styles.quickGrid}>
          {QUICK_NAV.map((q) => (
            <Pressable key={q.id} style={[styles.quickCard, { backgroundColor: q.bg }]} onPress={() => router.push(q.href as any)} testID={`quick-${q.id}`}>
              <Icon name={q.icon} size={22} color={q.fg} />
              <Text style={[styles.quickLabel, { color: q.fg }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Nearby Playdates</Text>
          <Pressable style={styles.filterBtn} onPress={() => router.push("/(tabs)/explore")} testID="home-filter">
            <Icon name="filter" size={14} color={colors.brandPrimary} />
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : playdates.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calendar" size={40} color={colors.brandPrimary} />
            <Text style={styles.emptyTitle}>No playdates yet</Text>
            <Text style={styles.emptyText}>Check back soon for new playdates from matched families.</Text>
          </View>
        ) : (
          playdates.map((p: any) => (
            <PlaydateCard key={p.id} item={p} testID={`playdate-card-${p.id}`} onPress={() => router.push(`/playdate/${p.id}`)} onJoin={() => joinMut.mutate(p.id)} />
          ))
        )}

        <View style={styles.trust} testID="home-trust-strip">
          <View style={styles.trustIcon}><Icon name="shield" size={18} color={colors.brandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>All families are verified</Text>
            <Text style={styles.trustSub}>Safe. Trusted. Peace of mind.</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.brandPrimary} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hello: { fontSize: 28, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20, marginBottom: spacing.lg },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl },
  quickCard: { flexBasis: "47%", flexGrow: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.lg, alignItems: "flex-start", gap: 6 },
  quickLabel: { fontWeight: "700", fontSize: 15 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterText: { color: colors.brandPrimary, fontWeight: "600" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { textAlign: "center", color: colors.muted, lineHeight: 22 },
  trust: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  trustIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  trustTitle: { fontWeight: "700", color: colors.onSurface },
  trustSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
