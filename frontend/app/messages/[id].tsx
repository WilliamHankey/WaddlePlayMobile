import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ThreadsAPI } from "@/src/api";

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading } = useQuery({ queryKey: ["thread", id], queryFn: () => ThreadsAPI.get(String(id)) });

  const sendMut = useMutation({
    mutationFn: (t: string) => ThreadsAPI.send(String(id), t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", id] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const acceptMut = useMutation({
    mutationFn: () => ThreadsAPI.accept(String(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", id] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const declineMut = useMutation({
    mutationFn: () => ThreadsAPI.decline(String(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", id] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      router.back();
    },
  });

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [data]);

  const onSend = () => {
    const t = text.trim();
    if (!t) return;
    sendMut.mutate(t);
    setText("");
  };

  if (isLoading || !data) return <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="chat-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Image source={{ uri: data.avatar_url }} style={styles.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} testID="chat-name">{data.name}</Text>
          <View style={styles.verifiedRow}>
            <Icon name="shield" size={11} color={colors.brandPrimary} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/family/${data.family_id}`)} testID="chat-open-profile">
          <Icon name="user" size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.sm }}>
        {data.status === "requested" && !data.is_initiator ? (
          <View style={styles.reqBanner} testID="chat-incoming-request">
            <Icon name="message-circle" size={18} color={colors.brandPrimary} />
            <Text style={styles.reqText}>{data.name} wants to say hi before a playdate. Accept to open the chat.</Text>
          </View>
        ) : null}
        {data.status === "requested" && data.is_initiator ? (
          <View style={styles.pendingBanner} testID="chat-outgoing-pending">
            <Icon name="clock" size={16} color={colors.onBrandSecondary} />
            <Text style={styles.pendingText}>Waiting for {data.name} to accept your friendly hello.</Text>
          </View>
        ) : null}
        {data.status === "declined" ? (
          <View style={styles.declinedBanner} testID="chat-declined">
            <Icon name="x-circle" size={16} color={colors.error} />
            <Text style={styles.declinedText}>This chat request was declined.</Text>
          </View>
        ) : null}
        {(data.messages || []).map((m: any, i: number) => (
          <View key={i} style={[styles.msg, m.from === "me" ? styles.msgMine : styles.msgTheirs]}>
            <Text style={[styles.msgText, m.from === "me" && { color: colors.onBrandPrimary }]}>{m.text}</Text>
            <Text style={[styles.msgAt, m.from === "me" && { color: colors.onBrandPrimary, opacity: 0.7 }]}>{m.at}</Text>
          </View>
        ))}
      </ScrollView>

      {data.status === "requested" && !data.is_initiator ? (
        <View style={[styles.decideBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={[styles.decideBtn, styles.decideDecline]} onPress={() => declineMut.mutate()} disabled={declineMut.isPending} testID="chat-decline">
            <Icon name="x" size={16} color={colors.error} />
            <Text style={styles.decideDeclineText}>Decline</Text>
          </Pressable>
          <Pressable style={[styles.decideBtn, styles.decideAccept]} onPress={() => acceptMut.mutate()} disabled={acceptMut.isPending} testID="chat-accept">
            {acceptMut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : (<><Icon name="check" size={16} color={colors.onBrandPrimary} /><Text style={styles.decideAcceptText}>Accept & reply</Text></>)}
          </Pressable>
        </View>
      ) : data.status === "declined" ? null : (
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.inputWrap}>
            <TextInput
              testID="chat-input"
              style={styles.input}
              placeholder={data.status === "requested" ? "Waiting for accept…" : "Write a kind message…"}
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              editable={data.status !== "requested"}
              multiline
            />
          </View>
          <Pressable style={[styles.sendBtn, (sendMut.isPending || !text.trim() || data.status === "requested") && { opacity: 0.5 }]} onPress={onSend} disabled={sendMut.isPending || !text.trim() || data.status === "requested"} testID="chat-send">
            <Icon name="send" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary },
  name: { fontWeight: "700", color: colors.onSurface },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "600" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  msg: { maxWidth: "80%", padding: spacing.md, borderRadius: radius.lg },
  msgMine: { alignSelf: "flex-end", backgroundColor: colors.brandPrimary, borderBottomRightRadius: 4 },
  msgTheirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  msgText: { color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  msgAt: { color: colors.muted, fontSize: 10, marginTop: 4 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  inputWrap: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  input: { color: colors.onSurface, fontSize: 14, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  reqBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandPrimary },
  reqText: { flex: 1, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.brandSecondary, borderRadius: radius.md },
  pendingText: { flex: 1, color: colors.onBrandSecondary, fontSize: 13, lineHeight: 18 },
  declinedBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error },
  declinedText: { flex: 1, color: colors.error, fontSize: 13, lineHeight: 18 },
  decideBar: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  decideBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: radius.pill },
  decideAccept: { backgroundColor: colors.brandPrimary },
  decideAcceptText: { color: colors.onBrandPrimary, fontWeight: "700" },
  decideDecline: { borderWidth: 1, borderColor: colors.error, backgroundColor: colors.surfaceTertiary },
  decideDeclineText: { color: colors.error, fontWeight: "700" },
});
