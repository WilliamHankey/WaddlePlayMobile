import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { LogBox, View, Text, ActivityIndicator, Image, StyleSheet } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

LogBox.ignoreAllLogs(true);

// Prewarm the icon assets used across the app so Expo Go Android loads them reliably.
try {
  Image.prefetch?.("https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800");
} catch { /* noop */ }

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoBg}>
          <View style={styles.logoRow}>
            <View style={[styles.blk, { backgroundColor: colors.brandPrimary }]} />
            <View style={[styles.blk, { backgroundColor: colors.brandSecondary }]} />
            <View style={[styles.blk, { backgroundColor: colors.brandTertiary }]} />
          </View>
          <View style={[styles.logoRow, { marginTop: 4 }]}>
            <View style={[styles.blk, { backgroundColor: colors.brandSecondary }]} />
            <View style={[styles.blk, { backgroundColor: colors.brandPrimary }]} />
          </View>
        </View>
        <Text style={styles.brand}>WaddlePlay</Text>
        <Text style={styles.tagline}>Safe playdates. Matched families.</Text>
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 24 }} />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  logoBg: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.lg },
  logoRow: { flexDirection: "row", gap: 4 },
  blk: { width: 22, height: 22, borderRadius: 4 },
  brand: { fontSize: 32, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  tagline: { color: colors.muted, marginTop: 6, fontSize: 13 },
});
