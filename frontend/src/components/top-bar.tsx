import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export function TopBar({ hasUnread = true }: { hasUnread?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const initial = (user?.name || "P").charAt(0).toUpperCase();

  return (
    <View style={styles.bar}>
      <Pressable style={styles.brand} onPress={() => router.push("/(tabs)")} testID="topbar-logo">
        <View style={styles.logoWrap}>
          <View style={[styles.blk, { backgroundColor: colors.brandPrimary }]} />
          <View style={[styles.blk, { backgroundColor: colors.brandSecondary, marginLeft: 2 }]} />
          <View style={[styles.blk, { backgroundColor: colors.brandTertiary, marginLeft: 2 }]} />
        </View>
        <Text style={styles.brandName}>WaddlePlay</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={() => router.push("/notifications")} testID="topbar-notifications">
          <Icon name="bell" size={19} color={colors.onSurface} />
          {hasUnread && <View style={styles.dot} />}
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push("/settings")} testID="topbar-settings">
          <Icon name="settings" size={19} color={colors.onSurface} />
        </Pressable>
        <Pressable style={styles.avatar} onPress={() => router.push("/profile")} testID="topbar-profile">
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoWrap: { flexDirection: "row" },
  blk: { width: 10, height: 10, borderRadius: 2 },
  brandName: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandTertiary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontWeight: "700" },
});
