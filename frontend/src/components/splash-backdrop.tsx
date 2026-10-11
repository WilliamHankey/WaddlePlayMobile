import React, { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const splashColors = {
  background: "#FCF9F6",
  ink: "#030303",
  warmYellow: "#EFCE8B",
  softLime: "#C4D998",
  sage: "#A6C5AD",
  dustyBlue: "#B7C7D7",
};

/** Artwork copied from ZeDBn; real device chrome supplies the status bar/notch. */
export function SplashBackdrop({ children }: { children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="startup-splash" accessibilityLabel="WaddlePlay is loading" style={styles.root}>
      <StatusBar style="dark" />
      <Image source={require("../../assets/images/splash-tiles.svg")} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityIgnoresInvertColors />
      <View pointerEvents="none" style={[styles.statusBar, { height: insets.top }]} />
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: splashColors.background, overflow: "hidden" },
  statusBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#FFFFFF" },
});
