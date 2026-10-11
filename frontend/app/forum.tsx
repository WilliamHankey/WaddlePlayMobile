import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { ForumAPI } from "@/src/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActionButton, EmptyState, Sheet, Notice, ui } from "@/src/components/screen-ui";
import { useAuth } from "@/src/auth-context";
import { ExploreBackButton } from "@/src/components/explore-back-button";

const TOPICS = ["All Topics", "Parenting", "Activities", "General", "Local"];

export default function Forum() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [topic, setTopic] = useState("All Topics");
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const [compose, setCompose] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTopic, setDraftTopic] = useState("Parenting");
  const [topicOpen, setTopicOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftError, setDraftError] = useState("");
  const [saving, setSaving] = useState(false);
  const draftKey = `waddleplay:discussion-draft:${user?.id ?? "guest"}`;
  const openCompose = async () => { setDraftError(""); try { const value = await AsyncStorage.getItem(draftKey); if (value) { const draft = JSON.parse(value); setDraftTitle(draft.title || ""); setDraftBody(draft.body || ""); setDraftTopic(draft.topic || "Parenting"); } } catch {} setCompose(true); };
  const postDiscussion = async () => {
    if (saving) return;
    if (draftTitle.trim().length < 3 || draftBody.trim().length < 10) { setDraftError("Add a title and at least 10 characters for your discussion."); return; }
    setSaving(true); setDraftError("");
    try {
      await ForumAPI.create({ title: draftTitle.trim(), body: draftBody.trim(), topic: draftTopic });
      setCompose(false); setDraftTitle(""); setDraftBody(""); setQuery(""); setTopic("All Topics");
      setNotice("Your discussion has been posted.");
      await qc.invalidateQueries({ queryKey: ["forum"] });
      await AsyncStorage.removeItem(draftKey).catch(() => {});
    } catch (error) { setDraftError(error instanceof Error ? error.message : "Couldn’t post your discussion. Please try again."); }
    finally { setSaving(false); }
  };
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["forum"], queryFn: ForumAPI.list });

  const posts = useMemo(() => {
    let list = data || [];
    if (topic !== "All Topics") list = list.filter((p: any) => p.topic === topic);
    if (query.trim()) list = list.filter((p: any) => p.title.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [data, topic, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}><ExploreBackButton testID="forum-back" /><Text style={styles.title}>Forum</Text></View>
        <Pressable style={styles.add} testID="forum-add" accessibilityLabel="Start a discussion" onPress={() => { void openCompose(); }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.brandPrimary }}>New Post +</Text>
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
                <Text style={[styles.chipText, active && { color: colors.brandPrimary }]}>{t}</Text>
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

        {!!notice && <Notice>{notice}</Notice>}
        {isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : isError ? <EmptyState title="Couldn’t load discussions" description="Check your connection." action="Try again" onAction={() => { void refetch(); }} /> : posts.length === 0 ? <EmptyState icon="message-square" title="No discussions found" description={`No one has started a discussion about “${query || topic}” yet. Be the first to ask the community.`} action="Start a discussion" onAction={() => { void openCompose(); }} secondary="Clear search" onSecondary={() => { setQuery(""); setTopic("All Topics"); }} /> : posts.map((p: any) => (
          <Pressable key={p.id} style={styles.post} testID={`forum-post-${p.id}`} onPress={() => setSelectedPost(p)}>
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
      <Sheet visible={compose} centered title="Start a Discussion" description="Ask a question, share an idea, or connect with your local parenting community." onClose={() => { if (!saving) setCompose(false); }}><View style={styles.composeField}><Icon name="message-square" size={18} color={colors.brandPrimary} /><View style={{ flex: 1 }}><Text style={styles.composeLabel}>Title</Text><TextInput style={styles.composeInput} value={draftTitle} maxLength={140} onChangeText={setDraftTitle} placeholder="What would you like to ask?" testID="discussion-title" /></View></View><Pressable style={styles.composeField} accessibilityLabel="Select discussion topic" onPress={() => setTopicOpen(!topicOpen)}><Icon name="grid" size={18} color={colors.brandPrimary} /><View style={{ flex: 1 }}><Text style={styles.composeLabel}>Topic</Text><Text style={styles.composeInput}>{draftTopic}</Text></View><Icon name="chevron-down" size={16} color={colors.muted} /></Pressable>{topicOpen && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{TOPICS.slice(1).map(t => <Pressable key={t} onPress={() => { setDraftTopic(t); setTopicOpen(false); }} style={{ padding: 10, borderRadius: 12, backgroundColor: draftTopic === t ? colors.surfaceTertiary : colors.surface }}><Text style={ui.body}>{t}</Text></Pressable>)}</View>}<View style={[styles.composeField, { alignItems: "flex-start" }]}><Icon name="edit-2" size={18} color={colors.brandPrimary} /><View style={{ flex: 1 }}><Text style={styles.composeLabel}>Your discussion</Text><TextInput style={[styles.composeInput, { minHeight: 86, textAlignVertical: "top" }]} placeholder="Write your question or share your thoughts…" multiline value={draftBody} maxLength={5000} onChangeText={setDraftBody} testID="discussion-body" /></View></View><Text style={[ui.body, { fontSize: 12, color: colors.muted, marginVertical: 8 }]}>Posting as {user?.name || "you"}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}><Icon name="shield" size={15} color={colors.brandPrimary} /><Text style={[ui.body, { fontSize: 12, flex: 1 }]}>Keep it kind. Never share another family’s private details.</Text></View>{!!draftError && <Notice error>{draftError}</Notice>}<ActionButton label="Post Discussion" testID="discussion-post" onPress={postDiscussion} loading={saving} /><ActionButton label="Cancel" secondary disabled={saving} onPress={() => setCompose(false)} /></Sheet>
      <Sheet visible={!!selectedPost} title={selectedPost?.title || "Discussion"} description={selectedPost ? `${selectedPost.author_name} · ${selectedPost.topic}` : ""} onClose={() => setSelectedPost(null)}><Text style={[ui.body, { lineHeight: 24 }]}>{selectedPost?.body}</Text><ActionButton label="Close" secondary onPress={() => setSelectedPost(null)} /></Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  composeField: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 14, marginBottom: 12 },
  composeLabel: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginBottom: 4 },
  composeInput: { fontFamily: fonts.body, color: colors.onSurface, fontSize: 14, padding: 0, minHeight: 22 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 25, fontWeight: "400", color: colors.onSurface },
  add: { paddingHorizontal: 12, height: 32, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  sticky: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, height: 44, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { flexShrink: 0, height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.surfaceTertiary, borderColor: colors.surfaceTertiary },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "500" },
  trendingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  trending: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.onSurface },
  post: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  postIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  postTitle: { fontFamily: fonts.bodyMedium, fontWeight: "400", color: colors.onSurface, marginBottom: 4 },
  postMeta: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  postMetaText: { color: colors.muted, fontSize: 11 },
  dot: { color: colors.muted, fontSize: 11 },
  postFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surfaceTertiary },
  author: { color: colors.onSurface, fontSize: 12, fontWeight: "500" },
  topicChip: { marginLeft: "auto", backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  topicChipText: { color: colors.onBrandSecondary, fontSize: 10, fontWeight: "700" },
});
