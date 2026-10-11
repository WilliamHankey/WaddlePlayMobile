import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { PlaydatesAPI } from "@/src/api";
import { PlaydateCard } from "@/src/components/playdate-card";
import { TopBar } from "@/src/components/top-bar";
import { useAuth } from "@/src/auth-context";
import { EmptyState, Notice, SkeletonCards } from "@/src/components/screen-ui";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["playdates"], queryFn: () => PlaydatesAPI.list() });
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

        {joinMut.isSuccess && <Notice>Join request sent. We’ll let you know when the host responds.</Notice>}
        {joinMut.isError && <Notice error>Couldn’t send your request. Please try again.</Notice>}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Nearby Playdates</Text>
          <Pressable style={styles.filterBtn} onPress={() => router.push("/(tabs)/explore")} testID="home-filter">
            <Icon name="filter" size={14} color={colors.brandPrimary} />
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <SkeletonCards />
        ) : isError ? <EmptyState title="Couldn’t load playdates" description="Check your connection and try again." action="Try again" onAction={() => { void refetch(); }} /> : playdates.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calendar" size={40} color={colors.brandPrimary} />
            <Text style={styles.emptyTitle}>No playdates yet</Text>
            <Text style={styles.emptyText}>Check back soon for new playdates from matched families.</Text>
          </View>
        ) : (
          playdates.map((p: any) => (
            <PlaydateCard key={p.id} item={p} testID={`playdate-card-${p.id}`} onPress={() => router.push(`/playdate/${p.id}`)} onJoin={() => { if (!joinMut.isPending) joinMut.mutate(p.id); }} />
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
  hello: { fontFamily: fonts.display, fontSize: 28, fontWeight: "400", color: colors.onSurface, marginTop: spacing.md },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20, marginBottom: spacing.lg },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: "400", color: colors.onSurface },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterText: { color: colors.brandPrimary, fontWeight: "600" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { textAlign: "center", color: colors.muted, lineHeight: 22 },
  trust: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#F0F4EF", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  trustIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  trustTitle: { fontWeight: "700", color: colors.onSurface },
  trustSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
