import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { PlaydatesAPI, ProfileAPI } from "@/src/api";
import { EmptyState, SkeletonCards } from "@/src/components/screen-ui";
import { Image } from "expo-image";

function Row({ item, onPress, past }: { item: any; onPress: () => void; past: boolean }) {
  const attendees = item.attendee_family_ids?.length || 0;
  return (
    <Pressable style={styles.row} onPress={onPress} testID={`pd-row-${item.id}`}>
      <Image source={{ uri: item.image_url }} style={styles.rowImg} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.agePill}><Text style={styles.ageText}>{item.age_range}</Text></View>
        </View>
        <View style={styles.rowMeta}><Icon name="map-pin" size={12} color={colors.muted} /><Text style={styles.rowMetaText}>{item.location}</Text></View>
        <View style={styles.rowMeta}><Icon name="calendar" size={12} color={colors.muted} /><Text style={styles.rowMetaText}>{item.date}</Text></View>
        <View style={styles.rowMeta}><Icon name="clock" size={12} color={colors.muted} /><Text style={styles.rowMetaText}>{item.start_time} – {item.end_time}</Text></View>
        <View style={styles.rowFooter}>
          <Text style={styles.rowAtt}>{attendees} attending</Text>
          {past ? (
            <View style={styles.pastPill}><Text style={styles.pastText}>Attended</Text></View>
          ) : (
            <View style={styles.joinedPill}><Icon name="check" size={11} color={colors.onBrandPrimary} /><Text style={styles.joinedText}>Confirmed</Text></View>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function PlaydatesTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: ProfileAPI.getMe });
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["playdates"], queryFn: () => PlaydatesAPI.list() });

  const { upcoming, past } = useMemo(() => {
    const list = data || [];
    const mine = list.filter((p: any) => p.host_family_id === profile?.id || (p.attendee_family_ids || []).includes(profile?.id));
    const today = new Date().toISOString().slice(0, 10);
    const past = mine.filter((p: any) => p.date < today);
    const upcoming = mine.filter((p: any) => p.date >= today);
    return { upcoming, past };
  }, [data, profile?.id]);

  const items = tab === "upcoming" ? upcoming : past;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Playdates</Text>
        <Pressable style={styles.addBtn} testID="pd-add" onPress={() => router.push("/playdate/create")}>
          <Icon name="plus" size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        <Pressable testID="pd-tab-upcoming" style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]} onPress={() => setTab("upcoming")}>
          <Icon name="calendar" size={14} color={tab === "upcoming" ? colors.brandPrimary : colors.muted} />
          <Text style={[styles.tabText, tab === "upcoming" && { color: colors.brandPrimary }]}>Upcoming</Text>
        </Pressable>
        <Pressable testID="pd-tab-past" style={[styles.tabBtn, tab === "past" && styles.tabBtnActive]} onPress={() => setTab("past")}>
          <Icon name="clock" size={14} color={tab === "past" ? colors.brandPrimary : colors.muted} />
          <Text style={[styles.tabText, tab === "past" && { color: colors.brandPrimary }]}>Past</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}>
        <Text style={styles.section}>{tab === "upcoming" ? "Your upcoming playdates" : "Past playdates"}</Text>
        {isLoading ? (
          <SkeletonCards />
        ) : isError ? <EmptyState title="Couldn’t load playdates" description="Please check your connection." action="Try again" onAction={() => { void refetch(); }} /> : items.length === 0 ? (
          <EmptyState icon="calendar" title={tab === "upcoming" ? "Your next adventure awaits" : "No past playdates yet"} description={tab === "upcoming" ? "You haven’t joined a playdate yet. Discover something nearby or host one for your family." : "Playdates you attend will appear here."} action="Find playdates" onAction={() => router.push("/(tabs)/explore")} secondary="Create a playdate" onSecondary={() => router.push("/playdate/create")} />
        ) : (
          items.map((p: any) => <Row key={p.id} item={p} past={tab === "past"} onPress={() => router.push(`/playdate/${p.id}`)} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 32, fontWeight: "400", color: colors.onSurface },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  tabsRow: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, marginHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.lg },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: radius.pill },
  tabBtnActive: { backgroundColor: colors.surfaceSecondary },
  tabText: { color: colors.muted, fontWeight: "600" },
  section: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowImg: { width: 90, height: 90, borderRadius: radius.md },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: 4 },
  rowTitle: { flex: 1, fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  agePill: { backgroundColor: colors.surfaceInverse, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  ageText: { color: colors.onSurfaceInverse, fontSize: 10, fontWeight: "600" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rowMetaText: { color: colors.muted, fontSize: 11 },
  rowFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  rowAtt: { color: colors.muted, fontSize: 11 },
  joinedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandPrimary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  joinedText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "700" },
  pastPill: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  pastText: { color: colors.onSurface, fontSize: 10, fontWeight: "600" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { color: colors.muted, textAlign: "center" },
});
