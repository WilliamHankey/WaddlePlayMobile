import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VerificationAPI } from "@/src/api";
import { colors } from "@/src/theme";
import { ActionButton, EmptyState, Notice, Sheet, ui } from "@/src/components/screen-ui";

export default function VerificationReview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-verification"], queryFn: VerificationAPI.pending, retry: false });
  const review = useMutation({ mutationFn: (status: "approved" | "rejected") => VerificationAPI.review(selected.user_id, status, reason), onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["admin-verification"] }); } });
  return <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}><ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}><ActionButton label="Back" secondary onPress={() => router.back()} /><Text style={[ui.heading, { marginVertical: 24 }]}>Community review</Text><Text style={ui.description}>Only server-authorized administrators can review requests. Complete your off-app community review before approving. This workflow does not verify government identity documents.</Text>{error ? <Notice error>{error.message}</Notice> : isLoading ? <Text style={ui.body}>Loading requests…</Text> : !data?.length ? <EmptyState icon="shield" title="All caught up" description="No families are awaiting review." action="Refresh" onAction={() => { void refetch(); }} /> : data.map((request: any) => <Pressable key={request.user_id} onPress={() => { review.reset(); setSelected(request); setReason(""); setChecked(false); }} style={{ backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 16, marginBottom: 12 }}><Text style={ui.label}>{request.name}</Text><Text style={ui.body}>{request.statement}</Text><Text style={[ui.description, { marginTop: 12 }]}>{new Date(request.submitted_at).toLocaleDateString()}</Text></Pressable>)}</ScrollView><Sheet visible={!!selected} title="Review family" description={selected?.name} onClose={() => { if (!review.isPending) setSelected(null); }}><Text style={ui.body}>{selected?.statement}</Text><Text style={ui.label}>Review note (required for rejection)</Text><TextInput style={ui.input} value={reason} onChangeText={setReason} multiline maxLength={500} /><Pressable onPress={() => setChecked(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ paddingVertical: 20 }}><Text style={ui.body}>{checked ? "☑" : "☐"} I completed the community review.</Text></Pressable>{review.isError && <Notice error>{review.error.message}</Notice>}<ActionButton label="Approve" disabled={!checked} loading={review.isPending} onPress={() => review.mutate("approved")} /><ActionButton label="Reject" danger disabled={!reason.trim() || review.isPending} onPress={() => review.mutate("rejected")} /></Sheet></View>;
}
