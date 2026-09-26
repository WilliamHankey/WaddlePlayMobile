import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true); setError(null);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e: any) { setError(e?.message || "Sign up failed"); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.xl }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back} testID="signup-back"><Icon name="arrow-left" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>Create your family account</Text>
        <Text style={styles.subtitle}>Join a community of families who understand neurodivergent needs.</Text>

        <View style={styles.field}><Icon name="user" size={18} color={colors.muted} /><TextInput testID="signup-name-input" style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} /></View>
        <View style={styles.field}><Icon name="mail" size={18} color={colors.muted} /><TextInput testID="signup-email-input" style={styles.input} placeholder="Email" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} /></View>
        <View style={styles.field}><Icon name="lock" size={18} color={colors.muted} /><TextInput testID="signup-password-input" style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} /></View>

        {error ? <Text testID="signup-error" style={styles.error}>{error}</Text> : null}

        <Pressable testID="signup-submit-button" style={styles.primaryBtn} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <><Text style={styles.primaryBtnText}>Create account</Text><Icon name="arrow-right" size={18} color={colors.onBrandPrimary} /></>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={{ color: colors.onSurface }}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild><Pressable testID="signup-goto-signin"><Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>Sign in</Text></Pressable></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, marginLeft: -spacing.sm },
  title: { fontSize: 30, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.xl, lineHeight: 22 },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg, height: 56, marginBottom: spacing.md },
  input: { flex: 1, color: colors.onSurface, fontSize: 15 },
  error: { color: colors.error, marginBottom: spacing.sm, textAlign: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brandPrimary, height: 56, borderRadius: radius.lg, marginTop: spacing.md },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.xl },
});
