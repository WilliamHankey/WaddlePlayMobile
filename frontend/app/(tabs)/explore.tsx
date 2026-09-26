import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { PlaydatesAPI } from "@/src/api";
import { PlaydateCard } from "@/src/components/playdate-card";

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid" as const },
  { id: "soccer", label: "Sports", icon: "target" as const },
  { id: "art", label: "Art", icon: "edit-3" as const },
  { id: "park", label: "Outdoors", icon: "sun" as const },
  { id: "music", label: "Music", icon: "music" as const },
  { id: "sensory", label: "Sensory", icon: "heart" as const },
];

export default function Explore() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.sticky}>
        <Text style={styles.title}>Explore</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  sticky: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 30, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md, marginBottom: spacing.md },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, height: 48, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 6 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "500" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { color: colors.muted, textAlign: "center" },
});
