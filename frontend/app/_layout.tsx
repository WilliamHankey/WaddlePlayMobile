import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { LogBox, View, Image, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomNav, type NavLabel } from "@/src/components/bottom-nav";
import { PushListener } from "@/src/components/push-listener";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { SplashBackdrop } from "@/src/components/splash-backdrop";
import { AuthProvider, useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

// Prewarm the icon assets used across the app so Expo Go Android loads them reliably.
try {
  Image.prefetch?.("https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800");
} catch { /* noop */ }

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const section = segments[0] === "(tabs)" ? segments[1] || "index" : segments[0];
  const active: NavLabel = ({ explore: "Explore", forum: "Explore", resources: "Explore", playdates: "Playdates", playdate: "Playdates", messages: "Messages", profile: "Profile", settings: "Profile", verification: "Profile", admin: "Profile" } as Record<string, NavLabel>)[section || "index"] || "Home";

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  if (loading) return <SplashBackdrop />;
  return (
    <View style={[styles.app, Platform.OS === "web" && { height, maxHeight: height }]}>
      <View style={styles.screen}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} /></View>
      {!!user && section !== "splash" && segments[0] !== "(auth)" && <BottomNav active={active} />}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LibreBaskerville: require("../assets/fonts/LibreBaskerville.ttf"),
    "Lato-Regular": require("../assets/fonts/Lato-Regular.ttf"),
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
  });
  if (!fontsLoaded && !fontError) return <SafeAreaProvider><SplashBackdrop /></SafeAreaProvider>;
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <AuthProvider>
              <AuthGate />
              <PushListener />
            </AuthProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, minHeight: 0, backgroundColor: colors.surface },
  screen: { flex: 1, minHeight: 0 },
});
