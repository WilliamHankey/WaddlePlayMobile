import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ForumAPI } from "@/src/api";

const TOPICS = ["All Topics", "Parenting", "Activities", "General", "Local"];

export default function Forum() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [topic, setTopic] = useState("All Topics");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["forum"], queryFn: ForumAPI.list });

  const posts = useMemo(() => {
    let list = data || [];
    if (topic !== "All Topics") list = list.filter((p: any) => p.topic === topic);
    if (query.trim()) list = list.filter((p: any) => p.title.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [data, topic, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="forum-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Forum</Text>
        <Pressable style={styles.add} testID="forum-add">
          <Icon name="plus" size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <View style={styles.search}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Search discussions…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} testID="forum-search" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TOPICS.map((t) => {
            const active = t === topic;
            return (
              <Pressable key={t} onPress={() => setTopic(t)} style={[styles.chip, active && styles.chipActive]} testID={`forum-topic-${t}`}>
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
        <View style={styles.trendingRow}>
          <Icon name="message-circle" size={14} color={colors.brandPrimary} />
          <Text style={styles.trending}>Trending discussions</Text>
        </View>

        {isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : posts.map((p: any) => (
          <Pressable key={p.id} style={styles.post} testID={`forum-post-${p.id}`}>
            <View style={styles.postIcon}><Icon name="message-square" size={18} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postTitle}>{p.title}</Text>
              <View style={styles.postMeta}>
                <Text style={styles.postMetaText}>{p.replies} replies</Text>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.postMetaText}>{p.hours_ago}h ago</Text>
              </View>
              <View style={styles.postFooter}>
                <Image source={{ uri: p.avatar_url }} style={styles.avatar} contentFit="cover" />
                <Text style={styles.author}>{p.author_name}</Text>
                <View style={styles.topicChip}><Text style={styles.topicChipText}>{p.topic}</Text></View>
              </View>
            </View>
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
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  sticky: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, height: 44, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { flexShrink: 0, height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "500" },
  trendingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  trending: { fontSize: 13, fontWeight: "700", color: colors.onSurface, textTransform: "uppercase", letterSpacing: 0.5 },
  post: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  postIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  postTitle: { fontWeight: "700", color: colors.onSurface, marginBottom: 4 },
  postMeta: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  postMetaText: { color: colors.muted, fontSize: 11 },
  dot: { color: colors.muted, fontSize: 11 },
  postFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surfaceTertiary },
  author: { color: colors.onSurface, fontSize: 12, fontWeight: "500" },
  topicChip: { marginLeft: "auto", backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  topicChipText: { color: colors.onBrandSecondary, fontSize: 10, fontWeight: "700" },
});
