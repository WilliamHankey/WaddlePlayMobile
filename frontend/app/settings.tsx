import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

function Row({ icon, title, subtitle, right, onPress, testID }: { icon: any; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; testID?: string }) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress} testID={testID}>
      <View style={styles.rowIcon}><Icon name={icon} size={18} color={colors.brandPrimary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right ? right : onPress ? <Icon name="chevron-right" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(true);
  const [locationOn, setLocationOn] = useState(true);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} testID="settings-back">
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || "P").charAt(0)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <Pressable style={styles.editBtn} onPress={() => router.push("/profile/edit")} testID="settings-edit-profile">
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <Row icon="user" title="Edit family profile" subtitle="Name, bio, children, preferences" onPress={() => router.push("/profile/edit")} testID="settings-profile" />
          <Row icon="shield" title="Verification" subtitle="Verified · Community reviewed" />
          <Row icon="lock" title="Private profile" subtitle="Only matched families can see details" right={<Switch value={privateProfile} onValueChange={setPrivateProfile} trackColor={{ true: colors.brandPrimary, false: colors.border }} />} />
        </View>

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.group}>
          <Row icon="bell" title="Push notifications" right={<Switch value={pushNotif} onValueChange={setPushNotif} trackColor={{ true: colors.brandPrimary, false: colors.border }} />} />
          <Row icon="mail" title="Email updates" right={<Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ true: colors.brandPrimary, false: colors.border }} />} />
          <Row icon="list" title="Notification history" onPress={() => router.push("/notifications")} testID="settings-notifications" />
        </View>

        <Text style={styles.section}>Preferences</Text>
        <View style={styles.group}>
          <Row icon="map-pin" title="Use my location" subtitle="For nearby playdates" right={<Switch value={locationOn} onValueChange={setLocationOn} trackColor={{ true: colors.brandPrimary, false: colors.border }} />} />
          <Row icon="globe" title="Language" subtitle="English" onPress={() => {}} />
          <Row icon="moon" title="Appearance" subtitle="Light" onPress={() => {}} />
        </View>

        <Text style={styles.section}>Safety</Text>
        <View style={styles.group}>
          <Row icon="slash" title="Blocked families" subtitle="Manage blocked accounts" onPress={() => {}} />
          <Row icon="flag" title="Reported activity" onPress={() => {}} />
          <Row icon="book-open" title="Community guidelines" onPress={() => {}} />
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.group}>
          <Row icon="help-circle" title="Help & support" onPress={() => {}} />
          <Row icon="info" title="About WaddlePlay" subtitle="v1.0.0" />
        </View>

        <Pressable testID="settings-signout" style={styles.signout} onPress={signOut}>
          <Icon name="log-out" size={18} color={colors.error} />
          <Text style={styles.signoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  userCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.xl, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontSize: 22, fontWeight: "700" },
  userName: { fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  userEmail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  editBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
  editBtnText: { color: colors.brandPrimary, fontWeight: "600" },
  section: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.xl, textTransform: "uppercase", letterSpacing: 0.5 },
  group: { marginHorizontal: spacing.xl, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontWeight: "600", color: colors.onSurface, fontSize: 14 },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  signout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.error, borderRadius: radius.lg },
  signoutText: { color: colors.error, fontWeight: "700" },
});
