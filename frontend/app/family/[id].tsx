import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { FamilyAPI, SafetyAPI } from "@/src/api";

function Chip({ label, tone = "primary" }: { label: string; tone?: "primary" | "secondary" | "tertiary" }) {
  const bg = tone === "primary" ? colors.brandPrimary : tone === "secondary" ? colors.brandSecondary : colors.brandTertiary;
  const fg = tone === "primary" ? colors.onBrandPrimary : tone === "secondary" ? colors.onBrandSecondary : colors.onBrandTertiary;
  return (<View style={[styles.chip, { backgroundColor: bg }]}><Text style={[styles.chipText, { color: fg }]}>{label}</Text></View>);
}

export default function FamilyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["family", id], queryFn: () => FamilyAPI.get(String(id)) });

  const blockMut = useMutation({
    mutationFn: () => data.blocked ? SafetyAPI.unblock(String(id)) : SafetyAPI.block(String(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", id] }),
  });

  const reportMut = useMutation({
    mutationFn: () => SafetyAPI.report(String(id), reason),
    onSuccess: () => { setReportOpen(false); setReason(""); },
  });

  if (isLoading || !data) return <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.brandPrimary} /></View>;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl, paddingTop: insets.top }}>
        <Pressable onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={20} color={colors.onSurface} /></Pressable>

        <View style={styles.hero}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{data.parent_name.charAt(0)}</Text></View>
          <Text style={styles.name}>{data.parent_name}</Text>
          <Text style={styles.location}><Icon name="map-pin" size={12} color={colors.muted} /> {data.location}</Text>

          <View style={styles.badges}>
            <View style={styles.matchPill}><Icon name="star" size={14} color={colors.onBrandSecondary} /><Text style={styles.matchText}>{data.match_score}% match</Text></View>
            {data.verified && <View style={styles.verifiedPill}><Icon name="shield" size={14} color={colors.onBrandPrimary} /><Text style={styles.verifiedText}>Verified</Text></View>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{data.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children</Text>
          {data.children?.map((c: any, i: number) => (
            <View key={i} style={styles.childRow}>
              <View style={styles.childAvatar}><Icon name="smile" size={18} color={colors.onBrandSecondary} /></View>
              <View>
                <Text style={styles.childName}>{c.name}, {c.age}</Text>
                {c.diagnosis ? <Text style={styles.childMeta}>{c.diagnosis} • {c.communication_style || "verbal"}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensory preferences</Text>
          <View style={styles.chips}>{data.sensory_preferences?.map((t: string) => <Chip key={t} label={t} tone="primary" />)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.chips}>{data.interests?.map((t: string) => <Chip key={t} label={t} tone="secondary" />)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family values</Text>
          <View style={styles.chips}>{data.family_values?.map((t: string) => <Chip key={t} label={t} tone="tertiary" />)}</View>
        </View>

        <View style={[styles.section, styles.safetyBox]}>
          <Text style={styles.safetyTitle}>Safety controls</Text>
          <Pressable style={styles.safetyBtn} onPress={() => blockMut.mutate()} testID="family-block">
            <Icon name="slash" size={16} color={colors.error} />
            <Text style={styles.safetyBtnText}>{data.blocked ? "Unblock this family" : "Block this family"}</Text>
          </Pressable>
          <Pressable style={styles.safetyBtn} onPress={() => setReportOpen(true)} testID="family-report">
            <Icon name="flag" size={16} color={colors.error} />
            <Text style={styles.safetyBtnText}>Report this family</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Report family</Text>
            <TextInput style={styles.textArea} multiline placeholder="What happened?" placeholderTextColor={colors.muted} value={reason} onChangeText={setReason} />
            <View style={styles.modalRow}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => setReportOpen(false)}><Text style={{ color: colors.onSurface, fontWeight: "600" }}>Cancel</Text></Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => reportMut.mutate()} disabled={!reason.trim()}><Text style={{ color: colors.onError, fontWeight: "700" }}>Submit</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  back: { position: "absolute", left: spacing.lg, top: spacing.md, zIndex: 1, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  hero: { alignItems: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarText: { color: colors.onBrandPrimary, fontSize: 40, fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  location: { color: colors.muted, marginTop: 6 },
  badges: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  matchPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  matchText: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: 12 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  verifiedText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.muted, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  bio: { color: colors.onSurface, lineHeight: 22 },
  childRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  childAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  childName: { fontWeight: "700", color: colors.onSurface },
  childMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 13, fontWeight: "600" },
  safetyBox: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.xl },
  safetyTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  safetyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  safetyBtnText: { color: colors.error, fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(38,70,83,0.5)", justifyContent: "center", padding: spacing.xl },
  modal: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  textArea: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.onSurface, textAlignVertical: "top" },
  modalRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
