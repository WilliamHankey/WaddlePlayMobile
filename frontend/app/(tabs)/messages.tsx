import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { ThreadsAPI } from "@/src/api";
import { EmptyState } from "@/src/components/screen-ui";

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["threads"], queryFn: ThreadsAPI.list });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const threads = (data || []).filter((t: any) => {
    const matches = `${t.name ?? ""} ${t.last ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (tab === "All" || (tab === "Unread" && t.unread > 0) || (tab === "Playdate Invites" && t.status === "requested") || (tab === "Groups" && t.is_group));
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}>
        <Text style={styles.title}>Messages</Text>
        <View style={[styles.info, { marginBottom: 12 }]}><Icon name="search" size={18} color={colors.muted} /><TextInput testID="messages-search" accessibilityLabel="Search messages" placeholder="Search messages" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={{ flex: 1, color: colors.onSurface, fontFamily: fonts.body, minHeight: 28 }} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>{["All", "Unread", "Playdate Invites", "Groups"].map(label => <Pressable key={label} testID={`messages-tab-${label}`} onPress={() => setTab(label)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === label ? colors.surfaceTertiary : colors.surfaceSecondary }}><Text style={{ fontFamily: fonts.body, color: tab === label ? colors.brandPrimary : colors.muted }}>{label}</Text></Pressable>)}</ScrollView>
        <View style={styles.info}>
          <Icon name="shield" size={16} color={colors.brandPrimary} />
          <Text style={styles.infoText}>Chat only opens once a playdate is mutually accepted.</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : isError ? <EmptyState title="Couldn’t load messages" description="Check your connection and try again." action="Try again" onAction={() => { void refetch(); }} /> : threads.length === 0 ? (
          <EmptyState icon="message-circle" title={query ? "No matching conversations" : tab === "Unread" ? "You’re all caught up" : "No messages yet"} description={query ? `We couldn’t find any conversations for “${query}”. Try another name or keyword.` : tab === "Unread" ? "There are no unread messages. Start a conversation or check your playdate invites." : "Request to join a playdate to start chatting."} action={query ? "Clear search" : "View all messages"} onAction={() => { setQuery(""); setTab("All"); }} />
        ) : threads.map((t: any) => {
          const isIncomingReq = t.status === "requested" && !t.is_initiator;
          const isOutgoingReq = t.status === "requested" && t.is_initiator;
          return (
            <Pressable key={t.id} style={styles.row} testID={`thread-${t.id}`} onPress={() => router.push(`/messages/${t.id}`)}>
              <Image source={{ uri: t.avatar_url }} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <View style={styles.rowHead}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{t.name}</Text>
                    {isIncomingReq && <View style={styles.reqTag}><Text style={styles.reqTagText}>New request</Text></View>}
                    {isOutgoingReq && <View style={styles.pendingTag}><Text style={styles.pendingTagText}>Pending</Text></View>}
                    {t.status === "declined" && <View style={styles.declinedTag}><Text style={styles.declinedTagText}>Declined</Text></View>}
                  </View>
                  <Text style={styles.time}>{t.at}</Text>
                </View>
                <View style={styles.rowFoot}>
                  <Text style={[styles.preview, t.unread > 0 && { color: colors.onSurface, fontWeight: "600" }]} numberOfLines={1}>{t.last}</Text>
                  {t.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{t.unread}</Text></View>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: fonts.display, fontSize: 32, fontWeight: "400", color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.md },
  info: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  infoText: { color: colors.muted, fontSize: 12, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceTertiary },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  time: { color: colors.muted, fontSize: 12 },
  rowFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  preview: { color: colors.muted, fontSize: 13, flex: 1, marginRight: spacing.md },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700" },
  center: { alignItems: "center", padding: spacing.xxl },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyText: { color: colors.muted, textAlign: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  reqTag: { backgroundColor: colors.brandPrimary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  reqTagText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "700" },
  pendingTag: { backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  pendingTagText: { color: colors.onBrandSecondary, fontSize: 10, fontWeight: "700" },
  declinedTag: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  declinedTagText: { color: colors.error, fontSize: 10, fontWeight: "700" },
});
