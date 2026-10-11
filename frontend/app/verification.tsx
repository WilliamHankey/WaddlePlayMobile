import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { VerificationAPI } from "@/src/api";
import { colors, fonts } from "@/src/theme";
import { ActionButton, EmptyState, Notice, SkeletonCards, ui } from "@/src/components/screen-ui";

export default function Verification() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [statement, setStatement] = useState("");
  const [consent, setConsent] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["verification"], queryFn: VerificationAPI.get, refetchInterval: 30000 });
  const mutation = useMutation({ mutationFn: () => VerificationAPI.submit(statement.trim(), consent), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["verification"] }); qc.invalidateQueries({ queryKey: ["profile"] }); } });
  return <View style={[styles.root, { paddingTop: insets.top }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}><Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ marginBottom: 24 }}><Icon name="chevron-left" size={24} color={colors.brandPrimary} /></Pressable><Text style={ui.heading}>Family verification</Text><Text style={[ui.description, { marginTop: 16 }]}>Help us keep every family safe. Our team reviews requests manually. This is community review—not an automated identity or background check. Never upload identity documents here.</Text>{isLoading ? <SkeletonCards /> : isError ? <EmptyState title="Couldn’t load verification" description="Check your connection." action="Try again" onAction={() => { void refetch(); }} /> : data?.status === "approved" ? <EmptyState icon="shield" title="Verified Parent" description="Your community review is complete. You can join playdates and appear on the map when location sharing is enabled." action="Explore families" onAction={() => router.push("/(tabs)/explore")} /> : data?.status === "pending" ? <EmptyState icon="clock" title="Verification pending" description="Your request is with our review team. We’ll update your profile when the review is complete. You can keep browsing while you wait." action="Back to my profile" onAction={() => router.push("/(tabs)/profile")} /> : <>{data?.status === "rejected" && <Notice error>{data.reason || "Please update your introduction and submit again."}</Notice>}<Text style={ui.label}>Introduce your family</Text><TextInput style={[ui.input, { minHeight: 140, textAlignVertical: "top" }]} testID="verification-statement" multiline maxLength={1000} placeholder="Tell our reviewers about your family and the playdates you’re looking for. Don’t include your address, medical details, or ID numbers." value={statement} onChangeText={setStatement} /><Pressable style={styles.consent} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} testID="verification-consent" onPress={() => setConsent(!consent)}><Icon name={consent ? "check-square" : "square"} size={22} color={colors.brandPrimary} /><Text style={[ui.body, { flex: 1, lineHeight: 22 }]}>I agree to community review and to follow WaddlePlay’s safety guidelines.</Text></Pressable>{mutation.isError && <Notice error>{mutation.error instanceof Error ? mutation.error.message : "Couldn’t send your request."}</Notice>}<ActionButton label="Submit for review" testID="verification-submit" loading={mutation.isPending} disabled={!consent || statement.trim().length < 20} onPress={() => mutation.mutate()} /></>}</ScrollView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, consent: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 }, title: { fontFamily: fonts.display } });
