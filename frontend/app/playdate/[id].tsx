import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { PlaydatesAPI, SafetyAPI } from "@/src/api";

export default function PlaydateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["playdate", id], queryFn: () => PlaydatesAPI.get(String(id)) });

  const joinMut = useMutation({
    mutationFn: () => PlaydatesAPI.join(String(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playdate", id] });
      qc.invalidateQueries({ queryKey: ["playdates"] });
      setToast("Request sent!");
      setTimeout(() => setToast(null), 2200);
    },
  });

  const blockMut = useMutation({
    mutationFn: () => SafetyAPI.block(data.host_family_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["playdates"] }); router.back(); },
  });

  const reportMut = useMutation({
    mutationFn: () => SafetyAPI.report(data.host_family_id, reportReason),
    onSuccess: () => { setReportOpen(false); setReportReason(""); setToast("Report submitted"); setTimeout(() => setToast(null), 2200); },
  });

  if (isLoading || !data) {
    return <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View>
          <Image source={{ uri: data.image_url }} style={styles.hero} contentFit="cover" />
          <Pressable onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]} testID="playdate-back">
            <Icon name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <View style={styles.ageBadge}><Text style={styles.ageText}>{data.age_range}</Text></View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} testID="playdate-title">{data.title}</Text>

          <View style={styles.matchRow}>
            <View style={styles.matchPill}><Icon name="star" size={14} color={colors.onBrandSecondary} /><Text style={styles.matchText}>{data.match_score}% match</Text></View>
            {data.host_verified && <View style={styles.verifiedPill}><Icon name="shield" size={14} color={colors.onBrandPrimary} /><Text style={styles.verifiedText}>Verified host</Text></View>}
          </View>

          <View style={styles.metaRow}><Icon name="map-pin" size={16} color={colors.muted} /><Text style={styles.metaText}>{data.location}</Text></View>
          <View style={styles.metaRow}><Icon name="calendar" size={16} color={colors.muted} /><Text style={styles.metaText}>{data.date}</Text></View>
          <View style={styles.metaRow}><Icon name="clock" size={16} color={colors.muted} /><Text style={styles.metaText}>{data.start_time} – {data.end_time}</Text></View>
          <View style={styles.metaRow}><Icon name="users" size={16} color={colors.muted} /><Text style={styles.metaText}>{(data.attendee_family_ids || []).length} / {data.max_children} families</Text></View>

          <Text style={styles.section}>About this playdate</Text>
          <Text style={styles.description}>{data.description}</Text>

          <Text style={styles.section}>Sensory-friendly features</Text>
          <View style={styles.chips}>{(data.sensory_friendly_tags || []).map((t: string) => (
            <View key={t} style={styles.chipP}><Text style={styles.chipPText}>{t}</Text></View>
          ))}</View>

          <Text style={styles.section}>Interests</Text>
          <View style={styles.chips}>{(data.interests || []).map((t: string) => (
            <View key={t} style={styles.chipS}><Text style={styles.chipSText}>{t}</Text></View>
          ))}</View>

          {data.host && (
            <>
              <Text style={styles.section}>Hosted by</Text>
              <Pressable onPress={() => router.push(`/family/${data.host.id}`)} style={styles.hostCard} testID="playdate-open-host">
                <View style={styles.hostAvatar}><Text style={styles.hostAvatarText}>{data.host.parent_name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostName}>{data.host.parent_name}</Text>
                  <Text style={styles.hostBio} numberOfLines={2}>{data.host.bio}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            </>
          )}

          <View style={styles.safetyRow}>
            <Pressable style={styles.safetyBtn} onPress={() => blockMut.mutate()} testID="playdate-block">
              <Icon name="slash" size={16} color={colors.error} />
              <Text style={styles.safetyBtnText}>Block host</Text>
            </Pressable>
            <Pressable style={styles.safetyBtn} onPress={() => setReportOpen(true)} testID="playdate-report">
              <Icon name="flag" size={16} color={colors.error} />
              <Text style={styles.safetyBtnText}>Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID="playdate-join"
          style={[styles.joinBtn, data.joined && { backgroundColor: colors.muted }]}
          onPress={() => joinMut.mutate()}
          disabled={data.joined || joinMut.isPending}
        >
          {joinMut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.joinText}>{data.joined ? "Joined ✓" : "Request to Join"}</Text>}
        </Pressable>
      </View>

      {toast && <View style={[styles.toast, { bottom: insets.bottom + 100 }]}><Text style={styles.toastText}>{toast}</Text></View>}

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Report this host</Text>
            <Text style={styles.modalSub}>Your report is confidential and reviewed by our safety team.</Text>
            <TextInput
              testID="report-reason-input"
              style={styles.textArea}
              multiline
              placeholder="What happened?"
              placeholderTextColor={colors.muted}
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalRow}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => setReportOpen(false)}><Text style={{ color: colors.onSurface, fontWeight: "600" }}>Cancel</Text></Pressable>
              <Pressable testID="report-submit" style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={() => reportMut.mutate()} disabled={!reportReason.trim() || reportMut.isPending}>
                <Text style={{ color: colors.onError, fontWeight: "700" }}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { width: "100%", height: 260 },
  back: { position: "absolute", left: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  ageBadge: { position: "absolute", top: 220, right: spacing.xl, backgroundColor: colors.surfaceInverse, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  ageText: { color: colors.onSurfaceInverse, fontWeight: "600" },
  body: { padding: spacing.xl },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  matchRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, flexWrap: "wrap" },
  matchPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  matchText: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: 12 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  verifiedText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  metaText: { color: colors.onSurface, fontSize: 14 },
  section: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { color: colors.onSurface, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipP: { backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipPText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "600" },
  chipS: { backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipSText: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: "600" },
  hostCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  hostAvatarText: { color: colors.onBrandPrimary, fontSize: 18, fontWeight: "700" },
  hostName: { fontWeight: "700", color: colors.onSurface },
  hostBio: { color: colors.muted, fontSize: 13, marginTop: 4 },
  safetyRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  safetyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.error, borderRadius: radius.md, paddingVertical: spacing.md },
  safetyBtnText: { color: colors.error, fontWeight: "600" },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  joinBtn: { backgroundColor: colors.brandPrimary, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  joinText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 16 },
  toast: { position: "absolute", left: spacing.xl, right: spacing.xl, backgroundColor: colors.surfaceInverse, padding: spacing.md, borderRadius: radius.md, alignItems: "center" },
  toastText: { color: colors.onSurfaceInverse, fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(38,70,83,0.5)", justifyContent: "center", padding: spacing.xl },
  modal: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  modalSub: { color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  textArea: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.onSurface, textAlignVertical: "top" },
  modalRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
