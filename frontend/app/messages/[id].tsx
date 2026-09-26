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
        {(data.messages || []).map((m: any, i: number) => (
          <View key={i} style={[styles.msg, m.from === "me" ? styles.msgMine : styles.msgTheirs]}>
            <Text style={[styles.msgText, m.from === "me" && { color: colors.onBrandPrimary }]}>{m.text}</Text>
            <Text style={[styles.msgAt, m.from === "me" && { color: colors.onBrandPrimary, opacity: 0.7 }]}>{m.at}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.inputWrap}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            placeholder="Write a kind message…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
          />
        </View>
        <Pressable style={styles.sendBtn} onPress={onSend} disabled={sendMut.isPending || !text.trim()} testID="chat-send">
          <Icon name="send" size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
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
});
