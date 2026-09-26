import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@waddleplay.com");
  const [password, setPassword] = useState("password123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true); setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandBlocks}>
            <View style={[styles.blk, { backgroundColor: colors.brandPrimary }]} />
            <View style={[styles.blk, { backgroundColor: colors.brandSecondary }]} />
            <View style={[styles.blk, { backgroundColor: colors.brandTertiary }]} />
          </View>
          <Text style={styles.brandName}>WaddlePlay</Text>
        </View>

        <Text style={styles.title} testID="signin-title">Welcome back!</Text>
        <Text style={styles.subtitle}>Sign in to connect with playdate families you <Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>trust.</Text></Text>

        <Image source={{ uri: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800" }} style={styles.hero} />

        <View style={styles.field}>
          <Icon name="mail" size={18} color={colors.muted} />
          <TextInput
            testID="signin-email-input"
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Icon name="lock" size={18} color={colors.muted} />
          <TextInput
            testID="signin-password-input"
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} testID="signin-toggle-password">
            <Icon name={showPw ? "eye-off" : "eye"} size={18} color={colors.muted} />
          </Pressable>
        </View>

        {error ? <Text testID="signin-error" style={styles.error}>{error}</Text> : null}

        <Pressable testID="signin-submit-button" style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
            <>
              <Text style={styles.primaryBtnText}>Sign In</Text>
              <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
            </>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.onSurface }}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable testID="signin-goto-signup"><Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>Create one →</Text></Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.xl },
  brandBlocks: { flexDirection: "row", gap: 2 },
  blk: { width: 10, height: 10, borderRadius: 2 },
  brandName: { fontSize: 22, fontWeight: "700", color: colors.onSurface },
  title: { fontSize: 36, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 22 },
  hero: { width: "100%", height: 180, borderRadius: radius.lg, marginBottom: spacing.xl },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg, height: 56, marginBottom: spacing.md },
  input: { flex: 1, color: colors.onSurface, fontSize: 15 },
  error: { color: colors.error, marginBottom: spacing.sm, textAlign: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.brandPrimary, height: 56, borderRadius: radius.lg, marginTop: spacing.md },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});
