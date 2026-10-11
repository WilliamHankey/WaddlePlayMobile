import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts, spacing } from "@/src/theme";
import { BrandMark } from "./brand-mark";

export function TopBar({ hasUnread = true }: { hasUnread?: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      <Pressable style={styles.brand} onPress={() => router.push("/(tabs)")} testID="topbar-logo">
        <BrandMark />
        <Text style={styles.brandName}>WaddlePlay</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={() => router.push("/notifications")} testID="topbar-notifications">
          <Icon name="bell" size={19} color={colors.onSurface} />
          {hasUnread && <View style={styles.dot} />}
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
  brandName: { fontFamily: fonts.body, fontSize: 20, color: "#525959" },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandTertiary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontWeight: "700" },
});
