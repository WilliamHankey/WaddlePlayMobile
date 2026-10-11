import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationsAPI, LocationAPI } from "@/src/api";
import { registerPush, unregisterPush } from "@/src/push";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";
import { ActionButton, Sheet, Notice } from "@/src/components/screen-ui";

const defaults = { messages: true, playdates: true, community: false };
const options = [
  { key: "messages" as const, title: "Messages", subtitle: "New conversations and replies" },
  { key: "playdates" as const, title: "Playdate updates", subtitle: "Join requests and approval updates" },
  { key: "community" as const, title: "Community updates", subtitle: "Updates on your verification review" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const { data: savedPrefs, isError: prefsError, isLoading: prefsLoading, refetch: refetchPrefs } = useQuery({ queryKey: ["notification-preferences"], queryFn: NotificationsAPI.preferences });
  const [sheet, setSheet] = useState<"notifications" | "logout" | "privacy" | "security" | "help" | "terms" | null>(null);
  const [prefs, setPrefs] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true); setError("");
    try {
      await NotificationsAPI.savePreferences(prefs);
      qc.setQueryData(["notification-preferences"], prefs);
      const message = Object.values(prefs).some(Boolean) ? await registerPush(true) : (await unregisterPush(), "Notification preferences saved. Push alerts are off.");
      setSheet(null); setNotice(message);
    } catch (error) { setError(error instanceof Error ? `Preferences may be saved, but push setup failed: ${error.message}` : "Couldn’t save preferences. Please try again."); }
    finally { setBusy(false); }
  };
  const removeLocation = async () => { setBusy(true); try { await LocationAPI.remove(); qc.setQueryData(["location"], { available: true, point: null }); qc.removeQueries({ queryKey: ["nearby-families"] }); setSheet(null); setNotice("Your shared location has been removed."); } catch { setError("Couldn’t remove your location. Please try again."); } finally { setBusy(false); } };
  const logout = async () => { setBusy(true); setError(""); try { await signOut(); } catch { setError("Couldn’t log out. Please try again."); } finally { setBusy(false); } };
  const close = () => { if (!busy) { setSheet(null); setError(""); } };
  const row = (icon: React.ComponentProps<typeof Icon>["name"], title: string, subtitle: string, action: () => void, testID: string) => <Pressable key={title} accessibilityRole="button" testID={testID} style={styles.row} onPress={action}><Icon name={icon} size={20} color={colors.brandPrimary} /><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSub}>{subtitle}</Text></View><Icon name="chevron-right" size={18} color={colors.muted} /></Pressable>;
  return <View style={[styles.root, { paddingTop: insets.top }]}><ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}><Pressable onPress={() => router.back()} testID="settings-back" accessibilityLabel="Go back" style={{ paddingVertical: 12 }}><Icon name="chevron-left" size={24} color={colors.brandPrimary} /></Pressable><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Manage your account, privacy and app preferences.</Text>{notice ? <Notice>{notice}</Notice> : null}<View style={styles.group}><Text style={styles.section}>Account</Text>{row("bell", "Notifications", "Manage your notifications and alerts", () => { setPrefs(savedPrefs || defaults); setError(""); setSheet("notifications"); }, "settings-notifications")}{row("shield", "Privacy", "Control your privacy and data settings", () => setSheet("privacy"), "settings-privacy")}{row("lock", "Password & Security", "Update your password and security options", () => setSheet("security"), "settings-security")}</View><View style={styles.group}><Text style={styles.section}>Support</Text>{row("help-circle", "Help Center", "Get help and find answers", () => setSheet("help"), "settings-help")}{row("file-text", "Terms of Service", "Read our terms and conditions", () => setSheet("terms"), "settings-terms")}{row("shield", "Privacy Policy", "Learn how we protect your data", () => setSheet("privacy"), "settings-policy")}</View><Pressable testID="settings-signout" style={styles.signout} onPress={() => setSheet("logout")}><Icon name="log-out" size={20} color={colors.error} /><Text style={styles.signoutText}>Log Out</Text></Pressable><Text style={styles.version}>App Version 1.0.0{"\n"}© 2025 PlayPals Connect. All rights reserved.</Text></ScrollView>
    <Sheet visible={sheet === "notifications"} centered title="Notification Preferences" description="Choose what you hear from us. You can change these preferences at any time." onClose={close}>{prefsError && <Notice error>Couldn’t load your saved preferences.</Notice>}{prefsError && <ActionButton label="Try again" secondary onPress={() => { void refetchPrefs(); }} />}{options.map(o => <View key={o.key} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{o.title}</Text><Text style={styles.rowSub}>{o.subtitle}</Text></View><Switch accessibilityLabel={o.title} testID={`notification-${o.key}`} value={prefs[o.key]} onValueChange={v => setPrefs(p => ({ ...p, [o.key]: v }))} trackColor={{ true: colors.brandPrimary, false: colors.border }} /></View>)}{!!error && <Notice error>{error}</Notice>}<ActionButton label="Save preferences" onPress={save} loading={busy} disabled={prefsLoading || prefsError} testID="notifications-save" /><ActionButton label="Cancel" secondary onPress={close} disabled={busy} /></Sheet>
    <Sheet visible={sheet === "logout"} title="Log out of WaddlePlay?" description="You’ll need to sign in again to view your messages and playdates. Your account and saved items will remain." onClose={close}>{!!error && <Notice error>{error}</Notice>}<ActionButton label="Log out" danger loading={busy} onPress={logout} testID="logout-confirm" /><ActionButton label="Stay signed in" secondary disabled={busy} onPress={close} /></Sheet>
    <Sheet visible={sheet !== null && !["notifications", "logout"].includes(sheet)} title={sheet === "privacy" ? "Privacy" : sheet === "security" ? "Password & Security" : sheet === "terms" ? "Terms of Service" : "Help Center"} description={sheet === "privacy" ? "Your exact home address is never shown. Manage what you share in your family profile." : sheet === "security" ? "You can update your sign-in email from Edit Profile after confirming your current password. Never share your password with other families." : sheet === "terms" ? "The full terms are not available in this version. Be kind and never share another family’s private details." : "Explore nearby playdates, connect with families, and find helpful parenting resources."} onClose={close}>{!!error && <Notice error>{error}</Notice>}{sheet === "privacy" && <ActionButton label="Stop sharing my location" secondary loading={busy} onPress={removeLocation} />}<ActionButton label="Edit family profile" onPress={() => { close(); router.push("/profile/edit"); }} /><ActionButton label="Close" secondary onPress={close} /></Sheet>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, title: { fontFamily: fonts.display, fontSize: 32, color: colors.onSurface, marginVertical: 12 }, subtitle: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 24 }, group: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 16, marginBottom: 16 }, section: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.onSurface, marginTop: 20, marginBottom: 8 }, row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border }, rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onSurface }, rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 5, lineHeight: 18 }, signout: { flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: "#FCEEEB" }, signoutText: { fontFamily: fonts.bodyMedium, color: colors.error }, version: { fontFamily: fonts.body, textAlign: "center", color: colors.muted, fontSize: 12, lineHeight: 22, marginTop: 16 } });
