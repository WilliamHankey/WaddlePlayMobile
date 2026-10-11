import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { PlaydatesAPI } from "@/src/api";
import { ActionButton, ui } from "@/src/components/screen-ui";

const CATEGORIES = [
  { id: "soccer", label: "Sports", icon: "target" as const },
  { id: "art", label: "Art", icon: "edit-3" as const },
  { id: "park", label: "Outdoors", icon: "sun" as const },
  { id: "music", label: "Music", icon: "music" as const },
  { id: "sensory", label: "Sensory", icon: "heart" as const },
];

const SENSORY_TAGS = ["quiet", "small groups", "outdoors", "predictable routine", "sensory play", "movement", "music", "flexible", "AAC-friendly"];
const INTEREST_OPTIONS = ["painting", "music", "soccer", "lego", "nature", "animals", "books", "swimming", "drums", "trampoline", "sensory play", "hiking"];

export default function CreatePlaydate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("park");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [ageMin, setAgeMin] = useState("4");
  const [ageMax, setAgeMax] = useState("6");
  const [description, setDescription] = useState("");
  const [maxKids, setMaxKids] = useState("4");
  const [sensory, setSensory] = useState<string[]>(["quiet", "small groups"]);
  const [interests, setInterests] = useState<string[]>([]);
  const [privateNote, setPrivateNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const mut = useMutation({
    mutationFn: () => PlaydatesAPI.create({
      title,
      category,
      location,
      date,
      start_time: startTime,
      end_time: endTime,
      age_min: Number(ageMin),
      age_max: Number(ageMax),
      description,
      sensory_friendly_tags: sensory,
      interests,
      max_children: parseInt(maxKids, 10) || 4,
      private_note: privateNote || undefined,
    }),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["playdates"] });
      router.replace(`/playdate/${created.id}`);
    },
    onError: (e: any) => setError(e?.message || "Could not create playdate"),
  });

  const canSubmit = !!(title.trim() && location.trim() && date.trim() && !mut.isPending);
  const submit = () => {
    if (!canSubmit) return;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < new Date().toISOString().slice(0, 10)) { setError("Enter a valid upcoming date (YYYY-MM-DD)."); return; }
    if (!ageMin.trim() || !ageMax.trim() || !Number.isInteger(Number(ageMin)) || !Number.isInteger(Number(ageMax)) || Number(ageMin) < 0 || Number(ageMax) > 18 || Number(ageMin) > Number(ageMax)) { setError("Enter a valid age range between 0 and 18."); return; }
    setError(null); mut.mutate();
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="create-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Create a playdate</Text>
        <Pressable
          style={[styles.saveBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!canSubmit}
          testID="create-submit"
        >
          {mut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Post</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={ui.description}>Bring local families together. Your event will be visible to verified parents.</Text>
        <Text style={styles.label}>Playdate name</Text>
        <TextInput testID="create-title" style={styles.input} placeholder="e.g. Gentle nature walk" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable key={c.id} onPress={() => setCategory(c.id)} style={[styles.chip, active && styles.chipActive]} testID={`create-cat-${c.id}`}>
                <Icon name={c.icon} size={14} color={active ? colors.onBrandPrimary : colors.onSurface} />
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput testID="create-location" style={styles.input} placeholder="e.g. Green Point Park" placeholderTextColor={colors.muted} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Date</Text>
        <TextInput testID="create-date" style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={date} onChangeText={setDate} />

        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start</Text>
            <TextInput testID="create-start" style={styles.input} placeholder="10:00 AM" placeholderTextColor={colors.muted} value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>End</Text>
            <TextInput testID="create-end" style={styles.input} placeholder="12:00 PM" placeholderTextColor={colors.muted} value={endTime} onChangeText={setEndTime} />
          </View>
        </View>

        <View style={styles.rowTwo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Min age</Text>
            <TextInput testID="create-agemin" style={styles.input} keyboardType="number-pad" value={ageMin} onChangeText={setAgeMin} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max age</Text>
            <TextInput testID="create-agemax" style={styles.input} keyboardType="number-pad" value={ageMax} onChangeText={setAgeMax} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max kids</Text>
            <TextInput testID="create-max" style={styles.input} keyboardType="number-pad" value={maxKids} onChangeText={setMaxKids} />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput testID="create-desc" style={[styles.input, styles.textarea]} multiline placeholder="Tell families what to expect." placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} />

        <Text style={styles.label}>Sensory-friendly tags</Text>
        <View style={styles.chips}>
          {SENSORY_TAGS.map((t) => {
            const active = sensory.includes(t);
            return (
              <Pressable key={t} onPress={() => toggle(sensory, setSensory, t)} style={[styles.chip, { borderColor: colors.brandPrimary }, active && { backgroundColor: colors.brandPrimary }]} testID={`create-sensory-${t}`}>
                <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Interests</Text>
        <View style={styles.chips}>
          {INTEREST_OPTIONS.map((t) => {
            const active = interests.includes(t);
            return (
              <Pressable key={t} onPress={() => toggle(interests, setInterests, t)} style={[styles.chip, { borderColor: colors.brandSecondary }, active && { backgroundColor: colors.brandSecondary }]} testID={`create-interest-${t}`}>
                <Text style={[styles.chipText, active && { color: colors.onBrandSecondary }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.privateHead}>
          <Icon name="lock" size={13} color={colors.brandPrimary} />
          <Text style={[styles.label, { marginTop: 0, textTransform: "none" }]}>Private note (only attending families)</Text>
        </View>
        <TextInput testID="create-private" style={[styles.input, styles.textarea]} multiline placeholder="e.g. Meet by the fountain. We&apos;ll bring a picnic blanket." placeholderTextColor={colors.muted} value={privateNote} onChangeText={setPrivateNote} />

        {error ? <Text testID="create-error" style={styles.error}>{error}</Text> : null}
        <ActionButton label="Create playdate" onPress={submit} loading={mut.isPending} disabled={!canSubmit} />
        <ActionButton label="Cancel" secondary disabled={mut.isPending} onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: "400", color: colors.onSurface },
  saveBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", minWidth: 68 },
  saveText: { color: colors.onBrandPrimary, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, marginTop: spacing.md, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 14 },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  rowTwo: { flexDirection: "row", gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 6 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, color: colors.onSurface },
  privateHead: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, marginBottom: 6 },
  error: { color: colors.error, marginTop: spacing.md, textAlign: "center" },
});
