import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";

const CATEGORY_ICONS: Record<string, { name: any; bg: string; fg: string }> = {
  soccer: { name: "target", bg: colors.brandPrimary, fg: colors.onBrandPrimary },
  art: { name: "edit-3", bg: colors.brandSecondary, fg: colors.onBrandSecondary },
  park: { name: "sun", bg: colors.brandPrimary, fg: colors.onBrandPrimary },
  music: { name: "music", bg: colors.brandTertiary, fg: colors.onBrandTertiary },
  sensory: { name: "heart", bg: colors.brandSecondary, fg: colors.onBrandSecondary },
};

export function PlaydateCard({ item, onPress, onJoin, testID }: { item: any; onPress: () => void; onJoin?: () => void; testID?: string }) {
  const cat = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.park;
  const joined = item.joined || false;
  const attendeesCount = item.attendee_family_ids?.length || 0;
  const btnBg = joined ? colors.muted : (item.match_score >= 70 ? colors.brandPrimary : colors.brandSecondary);
  const btnFg = joined ? colors.onSurfaceInverse : (item.match_score >= 70 ? colors.onBrandPrimary : colors.onBrandSecondary);

  return (
    <Pressable testID={testID} onPress={onPress} style={styles.card}>
      <View>
        <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" transition={200} />
        <View style={styles.ageBadge} testID={`${testID}-age`}>
          <Text style={styles.ageText}>{item.age_range}</Text>
        </View>
        {item.match_score != null && (
          <View style={styles.matchBadge} testID={`${testID}-match`}>
            <Icon name="star" size={11} color={colors.onBrandSecondary} />
            <Text style={styles.matchText}>{item.match_score}% match</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
            <Icon name={cat.name} size={18} color={cat.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={styles.attendees}>
            <View style={styles.avatarStack}>
              {(item.attendees_avatars || []).slice(0, 3).map((u: string, i: number) => (
                <Image key={i} source={{ uri: u }} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10 }]} contentFit="cover" />
              ))}
            </View>
            <Text style={styles.attendeesText}>{attendeesCount} attending</Text>
          </View>
        </View>

        <View style={styles.metaRow}><Icon name="map-pin" size={14} color={colors.muted} /><Text style={styles.metaText}>{item.location}</Text></View>
        <View style={styles.metaRow}><Icon name="calendar" size={14} color={colors.muted} /><Text style={styles.metaText}>{item.date}</Text></View>
        <View style={styles.metaRow}><Icon name="clock" size={14} color={colors.muted} /><Text style={styles.metaText}>{item.start_time} – {item.end_time}</Text></View>

        {item.match_reasons && item.match_reasons.length > 0 && (
          <View style={styles.reasonsRow} testID={`${testID}-reasons`}>
            <Icon name="check-circle" size={12} color={colors.brandPrimary} />
            <Text style={styles.reasonsLabel}>Why it matches:</Text>
            <View style={styles.reasonChips}>
              {item.match_reasons.slice(0, 3).map((r: string) => (
                <View key={r} style={styles.reasonChip}><Text style={styles.reasonChipText}>{r}</Text></View>
              ))}
            </View>
          </View>
        )}

        {onJoin && (
          <View style={styles.footer}>
            <Pressable testID={`${testID}-join`} style={[styles.joinBtn, { backgroundColor: btnBg }]} onPress={onJoin} disabled={joined}>
              <Text style={[styles.joinText, { color: btnFg }]}>{joined ? "Joined ✓" : "Request to Join"}</Text>
            </Pressable>
            <Pressable style={styles.bookmark} hitSlop={8}>
              <Icon name="bookmark" size={18} color={colors.brandPrimary} />
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  image: { width: "100%", height: 180 },
  ageBadge: { position: "absolute", top: spacing.md, right: spacing.md, backgroundColor: colors.surfaceInverse, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  ageText: { color: colors.onSurfaceInverse, fontSize: 12, fontWeight: "600" },
  matchBadge: { position: "absolute", top: spacing.md, left: spacing.md, backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", gap: 4 },
  matchText: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "700" },
  body: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  catIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  attendees: { alignItems: "flex-end" },
  avatarStack: { flexDirection: "row" },
  avatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.surfaceSecondary, backgroundColor: colors.surfaceTertiary },
  attendeesText: { fontSize: 10, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  metaText: { color: colors.muted, fontSize: 13 },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  joinBtn: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  joinText: { fontSize: 14, fontWeight: "700" },
  bookmark: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  reasonsRow: { marginTop: spacing.sm, backgroundColor: colors.surfaceTertiary, padding: spacing.sm, borderRadius: radius.md, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  reasonsLabel: { fontSize: 11, fontWeight: "700", color: colors.brandPrimary, textTransform: "uppercase", letterSpacing: 0.3 },
  reasonChips: { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
  reasonChip: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.brandPrimary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  reasonChipText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "600" },
});
