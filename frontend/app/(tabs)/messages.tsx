import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ThreadsAPI } from "@/src/api";
import { TopBar } from "@/src/components/top-bar";

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["threads"], queryFn: ThreadsAPI.list });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.info}>
          <Icon name="shield" size={16} color={colors.brandPrimary} />
          <Text style={styles.infoText}>Chat only opens once a playdate is mutually accepted.</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : (data || []).length === 0 ? (
          <View style={styles.empty}>
            <Icon name="inbox" size={32} color={colors.brandPrimary} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Request to join a playdate to start chatting.</Text>
          </View>
        ) : (data || []).map((t: any) => {
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
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.md },
  info: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  infoText: { color: colors.muted, fontSize: 12, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
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
