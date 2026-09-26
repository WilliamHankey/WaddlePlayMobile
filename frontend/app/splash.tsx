import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Splash() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const scale = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      if (loading) return;
      router.replace(user ? "/(tabs)" : "/(auth)/sign-in");
    }, 1400);
    return () => clearTimeout(t);
  }, [loading, user]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ scale }], opacity, alignItems: "center" }}>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  logoBg: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, marginBottom: spacing.lg, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  logoRow: { flexDirection: "row", gap: 4 },
  blk: { width: 22, height: 22, borderRadius: 4 },
  brand: { fontSize: 36, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  tagline: { color: colors.muted, marginTop: 6, fontSize: 14 },
});
