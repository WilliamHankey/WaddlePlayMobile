import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { PlaydatesAPI } from "@/src/api";
import { PlaydateCard } from "@/src/components/playdate-card";
import { TopBar } from "@/src/components/top-bar";

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid" as const },
  { id: "soccer", label: "Sports", icon: "target" as const },
  { id: "art", label: "Art", icon: "edit-3" as const },
  { id: "park", label: "Outdoors", icon: "sun" as const },
  { id: "music", label: "Music", icon: "music" as const },
  { id: "sensory", label: "Sensory", icon: "heart" as const },
];

// Static positions for map pins (percentages relative to map image size)
const PIN_POS: Record<string, { top: string; left: string }> = {
  "pd-soccer": { top: "22%", left: "28%" },
  "pd-art": { top: "40%", left: "62%" },
  "pd-park": { top: "58%", left: "20%" },
  "pd-music": { top: "70%", left: "70%" },
  "pd-sensory": { top: "35%", left: "42%" },
};

const MAP_BG = "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format";

export default function Explore() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"list" | "map">("list");
  const [pinId, setPinId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["playdates", category],
    queryFn: () => PlaydatesAPI.list(category === "all" ? undefined : { category }),
  });

  const filtered = useMemo(() => {
    const list = data || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p: any) =>
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      (p.sensory_friendly_tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
      (p.interests || []).some((t: string) => t.toLowerCase().includes(q))
    );
  }, [data, query]);

  const selectedPin = pinId ? filtered.find((p: any) => p.id === pinId) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar />
      <View style={styles.sticky}>
        <Text style={styles.title}>Explore</Text>

        <View style={styles.tabsRow}>
          <Pressable testID="explore-tab-list" style={[styles.tabBtn, tab === "list" && styles.tabBtnActive]} onPress={() => setTab("list")}>
            <Icon name="list" size={16} color={tab === "list" ? colors.onBrandPrimary : colors.onSurface} />
            <Text style={[styles.tabText, tab === "list" && { color: colors.onBrandPrimary }]}>List</Text>
          </Pressable>
          <Pressable testID="explore-tab-map" style={[styles.tabBtn, tab === "map" && styles.tabBtnActive]} onPress={() => setTab("map")}>
            <Icon name="map" size={16} color={tab === "map" ? colors.onBrandPrimary : colors.onSurface} />
            <Text style={[styles.tabText, tab === "map" && { color: colors.onBrandPrimary }]}>Map</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput testID="explore-search" style={styles.searchInput} placeholder="Search sensory, interests, place" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable key={c.id} testID={`chip-${c.id}`} onPress={() => setCategory(c.id)} style={[styles.chip, active && styles.chipActive]}>
                <Icon name={c.icon} size={14} color={active ? colors.onBrandPrimary : colors.onSurface} />
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {tab === "list" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="search" size={36} color={colors.brandPrimary} />
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptyText}>Try a different category or search.</Text>
            </View>
          ) : (
            filtered.map((p: any) => (
              <PlaydateCard key={p.id} item={p} testID={`explore-card-${p.id}`} onPress={() => router.push(`/playdate/${p.id}`)} />
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapWrap} testID="explore-map">
          <Image source={{ uri: MAP_BG }} style={styles.mapImg} contentFit="cover" />
          <View style={styles.mapTint} pointerEvents="none" />
          {filtered.map((p: any) => {
            const pos = PIN_POS[p.id] || { top: `${20 + Math.random() * 60}%`, left: `${20 + Math.random() * 60}%` };
            return (
              <Pressable
                key={p.id}
                testID={`map-pin-${p.id}`}
                style={[styles.pin, { top: pos.top as any, left: pos.left as any }]}
                onPress={() => setPinId(p.id)}
              >
                <View style={styles.pinInner}>
                  <Text style={styles.pinText}>{p.match_score}%</Text>
                </View>
                <View style={styles.pinTail} />
              </Pressable>
            );
          })}

          {selectedPin && (
            <View style={styles.bubble} testID="map-bubble">
              <Pressable style={styles.bubbleClose} onPress={() => setPinId(null)} testID="map-bubble-close">
                <Icon name="x" size={14} color={colors.onSurface} />
              </Pressable>
              <Image source={{ uri: selectedPin.image_url }} style={styles.bubbleImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bubbleTitle} numberOfLines={1}>{selectedPin.title}</Text>
                <Text style={styles.bubbleMeta} numberOfLines={1}><Icon name="user" size={11} color={colors.muted} /> {selectedPin.host_name}</Text>
                <Text style={styles.bubbleMeta} numberOfLines={1}><Icon name="map-pin" size={11} color={colors.muted} /> {selectedPin.location}</Text>
                <View style={styles.bubbleFooter}>
                  <View style={styles.matchPill}><Text style={styles.matchPillText}>{selectedPin.match_score}% match</Text></View>
                  <Pressable style={styles.viewBtn} onPress={() => router.push(`/playdate/${selectedPin.id}`)} testID="map-bubble-view">
                    <Text style={styles.viewBtnText}>View</Text>
                    <Icon name="chevron-right" size={14} color={colors.onBrandPrimary} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  sticky: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.md },
  tabsRow: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, marginBottom: spacing.md },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: radius.pill },
  tabBtnActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.onSurface, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, height: 44, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 6 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "500" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { color: colors.muted, textAlign: "center" },
  mapWrap: { flex: 1, backgroundColor: colors.surfaceTertiary },
  mapImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  mapTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(94,135,109,0.15)" },
  pin: { position: "absolute" },
  pinInner: { backgroundColor: colors.brandPrimary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.surfaceSecondary, minWidth: 44, alignItems: "center" },
  pinText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 11 },
  pinTail: { alignSelf: "center", width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.brandPrimary, marginTop: -1 },
  bubble: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.xl, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  bubbleClose: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", zIndex: 1 },
  bubbleImg: { width: 72, height: 72, borderRadius: radius.md },
  bubbleTitle: { fontWeight: "700", color: colors.onSurface, marginBottom: 4 },
  bubbleMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  bubbleFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  matchPill: { backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  matchPillText: { color: colors.onBrandSecondary, fontSize: 11, fontWeight: "700" },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  viewBtnText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
});
