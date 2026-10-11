import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors } from "@/src/theme";

export function ExploreBackButton({ testID }: { testID: string }) {
  const router = useRouter();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel="Back to Explore" hitSlop={6} onPress={() => router.dismissTo("/(tabs)/explore")} style={styles.button}>
      <Icon name="chevron-left" size={24} color={colors.brandPrimary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
