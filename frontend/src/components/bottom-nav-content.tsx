import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, fonts } from "@/src/theme";

export const NAV_ITEMS = [
  { label: "Home", icon: "home", path: "/(tabs)" },
  { label: "Explore", icon: "search", path: "/(tabs)/explore" },
  { label: "Playdates", icon: "users", path: "/(tabs)/playdates" },
  { label: "Messages", icon: "message-square", path: "/(tabs)/messages" },
  { label: "Profile", icon: "user", path: "/(tabs)/profile" },
] as const;
export type NavLabel = typeof NAV_ITEMS[number]["label"];

export function BottomNavContent({ active }: { active: NavLabel }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View testID="bottom-navigation" style={[styles.nav, { paddingBottom: 8 + insets.bottom }]}>
      {NAV_ITEMS.map(item => (
        <Pressable key={item.label} testID={`nav-${item.label.toLowerCase()}`} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: item.label === active }} onPress={() => router.replace(item.path as Href)} style={styles.item}>
          <Icon name={item.icon} size={22} color={item.label === active ? colors.brandPrimary : colors.muted} />
          <Text style={[styles.label, item.label === active && { color: colors.brandPrimary }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  nav: { flexShrink: 0, flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingHorizontal: 12, minHeight: 60 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, minHeight: 43 },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
