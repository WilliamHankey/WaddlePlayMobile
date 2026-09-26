import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ProfileAPI } from "@/src/api";

const SENSORY_OPTIONS = ["quiet", "small groups", "outdoors", "predictable routine", "sensory play", "movement", "music", "flexible"];
const INTEREST_OPTIONS = ["painting", "music", "soccer", "lego", "nature", "animals", "books", "swimming", "drums", "trampoline", "sensory play", "hiking"];
const VALUE_OPTIONS = ["neurodiversity-affirming", "kindness", "patience", "outdoors", "inclusion", "creativity", "movement-friendly", "AAC-friendly"];
const COMM_OPTIONS = ["verbal", "AAC", "mixed"];

function TagPicker({ label, options, value, onChange, tone = "primary" }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; tone?: "primary" | "secondary" | "tertiary" }) {
  const bg = tone === "primary" ? colors.brandPrimary : tone === "secondary" ? colors.brandSecondary : colors.brandTertiary;
  const fg = tone === "primary" ? colors.onBrandPrimary : tone === "secondary" ? colors.onBrandSecondary : colors.onBrandTertiary;
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <Pressable key={o} onPress={() => toggle(o)} style={[styles.chip, { borderColor: bg }, active && { backgroundColor: bg }]} testID={`edit-chip-${o}`}>
              <Text style={[styles.chipText, active && { color: fg }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: ProfileAPI.getMe });

  const [parentName, setParentName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [sensory, setSensory] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [comm, setComm] = useState<string>("verbal");

  useEffect(() => {
    if (data) {
      setParentName(data.parent_name || "");
      setLocation(data.location || "");
      setBio(data.bio || "");
      setSensory(data.sensory_preferences || []);
      setInterests(data.interests || []);
      setValues(data.family_values || []);
      setComm(data.communication_style || "verbal");
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => ProfileAPI.update({
      parent_name: parentName,
      location,
      bio,
      sensory_preferences: sensory,
      interests,
      family_values: values,
      communication_style: comm,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
  });

  if (isLoading) return <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="edit-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <Pressable style={styles.saveBtn} onPress={() => mut.mutate()} disabled={mut.isPending} testID="edit-save">
          {mut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl + 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Parent name</Text>
        <TextInput style={styles.input} value={parentName} onChangeText={setParentName} placeholder="Your name" placeholderTextColor={colors.muted} testID="edit-name" />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, neighborhood" placeholderTextColor={colors.muted} testID="edit-location" />

        <Text style={styles.label}>About your family</Text>
        <TextInput style={[styles.input, styles.textarea]} multiline value={bio} onChangeText={setBio} placeholder="Tell other families about your kids and what a good playdate looks like." placeholderTextColor={colors.muted} testID="edit-bio" />

        <Text style={styles.label}>Communication style</Text>
        <View style={styles.chips}>
          {COMM_OPTIONS.map((c) => (
            <Pressable key={c} onPress={() => setComm(c)} style={[styles.chip, { borderColor: colors.brandPrimary }, comm === c && { backgroundColor: colors.brandPrimary }]} testID={`edit-comm-${c}`}>
              <Text style={[styles.chipText, comm === c && { color: colors.onBrandPrimary }]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
        <TagPicker label="Sensory preferences" options={SENSORY_OPTIONS} value={sensory} onChange={setSensory} tone="primary" />
        <TagPicker label="Interests" options={INTEREST_OPTIONS} value={interests} onChange={setInterests} tone="secondary" />
        <TagPicker label="Family values" options={VALUE_OPTIONS} value={values} onChange={setValues} tone="tertiary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  saveBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", minWidth: 64 },
  saveText: { color: colors.onBrandPrimary, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 6, marginTop: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 14, marginBottom: spacing.md },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, backgroundColor: colors.surfaceSecondary },
  chipText: { fontSize: 13, color: colors.onSurface },
});
