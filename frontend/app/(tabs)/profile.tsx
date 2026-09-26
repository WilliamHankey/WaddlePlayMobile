import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { ProfileAPI } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { TopBar } from "@/src/components/top-bar";

function Chip({ label, tone = "primary" }: { label: string; tone?: "primary" | "secondary" | "tertiary" }) {
  const bg = tone === "primary" ? colors.brandPrimary : tone === "secondary" ? colors.brandSecondary : colors.brandTertiary;
  const fg = tone === "primary" ? colors.onBrandPrimary : tone === "secondary" ? colors.onBrandSecondary : colors.onBrandTertiary;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: ProfileAPI.getMe });

  if (isLoading || !profile) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={styles.headerRow}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="profile-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>My family</Text>
        <Pressable style={styles.editBtnTop} onPress={() => router.push("/profile/edit")} testID="profile-edit-top">
          <Icon name="edit-2" size={16} color={colors.brandPrimary} />
        </Pressable>
      </View>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(profile.parent_name || "P").charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} testID="profile-name">{profile.parent_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.verifiedRow}>
            <Icon name="shield" size={14} color={colors.brandPrimary} />
            <Text style={styles.verifiedText}>Verified family</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.metaRow}><Icon name="map-pin" size={14} color={colors.muted} /><Text style={styles.metaText}>{profile.location || "Not set"}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About us</Text>
        <Text style={styles.bio}>{profile.bio || "Add a short bio to help other families get to know you."}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Children</Text>
        {profile.children?.length ? profile.children.map((c: any, i: number) => (
          <View key={i} style={styles.childRow}>
            <View style={styles.childAvatar}><Icon name="smile" size={18} color={colors.onBrandSecondary} /></View>
            <View>
              <Text style={styles.childName}>{c.name}, {c.age}</Text>
              {c.diagnosis ? <Text style={styles.childMeta}>{c.diagnosis} • {c.communication_style || "verbal"}</Text> : null}
            </View>
          </View>
        )) : <Text style={styles.muted}>No children added yet.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sensory preferences</Text>
        <View style={styles.chips}>{(profile.sensory_preferences || []).map((p: string) => <Chip key={p} label={p} tone="primary" />)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.chips}>{(profile.interests || []).map((p: string) => <Chip key={p} label={p} tone="secondary" />)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family values</Text>
        <View style={styles.chips}>{(profile.family_values || []).map((p: string) => <Chip key={p} label={p} tone="tertiary" />)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety</Text>
        <View style={styles.safetyRow}>
          <Icon name="shield" size={18} color={colors.brandPrimary} />
          <Text style={styles.safetyText}>Community-verified profile</Text>
        </View>
        <View style={styles.safetyRow}>
          <Icon name="lock" size={18} color={colors.brandPrimary} />
          <Text style={styles.safetyText}>Private by default — messages unlock after mutual accept</Text>
        </View>
        <View style={styles.safetyRow}>
          <Icon name="slash" size={18} color={colors.brandPrimary} />
          <Text style={styles.safetyText}>Block & report available on every profile</Text>
        </View>
      </View>

      <Pressable testID="profile-signout" style={styles.signout} onPress={signOut}>
        <Icon name="log-out" size={18} color={colors.error} />
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  editBtnTop: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brandPrimary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: colors.onSurface },
  email: { color: colors.muted, marginTop: 2 },
  verifiedRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 },
  verifiedText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "600" },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.muted, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: colors.onSurface, fontSize: 15 },
  bio: { color: colors.onSurface, lineHeight: 22 },
  childRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  childAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  childName: { fontWeight: "700", color: colors.onSurface },
  childMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 13, fontWeight: "600" },
  safetyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  safetyText: { color: colors.onSurface, flex: 1 },
  muted: { color: colors.muted },
  signout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.error, borderRadius: radius.lg },
  signoutText: { color: colors.error, fontWeight: "700" },
});
