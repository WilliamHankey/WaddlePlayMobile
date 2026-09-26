import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ResourcesAPI } from "@/src/api";

const KIND_FILTERS = [
  { id: "all", label: "All", icon: "grid" as const },
  { id: "article", label: "Articles", icon: "file-text" as const },
  { id: "guide", label: "Guides", icon: "book-open" as const },
  { id: "video", label: "Videos", icon: "play-circle" as const },
];

export default function Resources() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["resources"], queryFn: ResourcesAPI.list });

  const { featured, latest } = useMemo(() => {
    let list = (data || []) as any[];
    if (kind !== "all") list = list.filter((r) => r.kind === kind);
    if (query.trim()) list = list.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
    return { featured: list.filter((r) => r.featured), latest: list.filter((r) => !r.featured) };
  }, [data, kind, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="resources-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Resources</Text>
        <Pressable style={styles.iconBtn} testID="resources-saved">
          <Icon name="bookmark" size={18} color={colors.brandPrimary} />
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <View style={styles.search}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Search resources…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} testID="resources-search" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {KIND_FILTERS.map((k) => {
            const active = k.id === kind;
            return (
              <Pressable key={k.id} onPress={() => setKind(k.id)} style={[styles.chip, active && styles.chipActive]} testID={`resources-kind-${k.id}`}>
                <Icon name={k.icon} size={14} color={active ? colors.onBrandPrimary : colors.onSurface} />
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
        {isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : (
          <>
            {featured.length > 0 && (
              <>
                <Text style={styles.section}>Featured</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.xl }}>
                  {featured.map((r: any) => (
                    <Pressable key={r.id} style={styles.featured} testID={`resource-${r.id}`}>
                      <Image source={{ uri: r.image_url }} style={styles.featuredImg} contentFit="cover" />
                      <View style={styles.featuredBody}>
                        <View style={styles.kindPill}><Text style={styles.kindPillText}>{r.kind}</Text></View>
                        <Text style={styles.featuredTitle} numberOfLines={2}>{r.title}</Text>
                        <Text style={styles.featuredSub} numberOfLines={2}>{r.summary}</Text>
                        <View style={styles.readRow}>
                          <Icon name="clock" size={11} color={colors.muted} />
                          <Text style={styles.read}>{r.read_minutes} min read</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.section, { marginTop: spacing.xl }]}>Latest resources</Text>
            {latest.map((r: any) => (
              <Pressable key={r.id} style={styles.row} testID={`resource-${r.id}`}>
                <Image source={{ uri: r.image_url }} style={styles.rowImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{r.title}</Text>
                  <View style={styles.rowMetaRow}>
                    <View style={[styles.kindPill, { backgroundColor: colors.surfaceTertiary }]}><Text style={[styles.kindPillText, { color: colors.onSurface }]}>{r.kind}</Text></View>
                    <Text style={styles.read}>{r.read_minutes} min</Text>
                  </View>
                </View>
                <Icon name="bookmark" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  sticky: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, height: 44, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { flexShrink: 0, height: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "500" },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: spacing.md, textTransform: "uppercase", letterSpacing: 0.5 },
  featured: { width: 260, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  featuredImg: { width: "100%", height: 130 },
  featuredBody: { padding: spacing.md, gap: 6 },
  kindPill: { alignSelf: "flex-start", backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  kindPillText: { color: colors.onBrandSecondary, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  featuredTitle: { fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  featuredSub: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  readRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  read: { color: colors.muted, fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowImg: { width: 72, height: 72, borderRadius: radius.md },
  rowTitle: { fontWeight: "700", color: colors.onSurface, marginBottom: 6 },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
