// Waddle Play (PlayPals Connect) design tokens. Light theme only.
// Values sourced from the WaddlePlay mobile canvas.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FCFCFC",
  onSurface: "#183044",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#183044",
  surfaceTertiary: "#EDF3EF",
  onSurfaceTertiary: "#183044",
  surfaceInverse: "#183044",
  onSurfaceInverse: "#FFFFFF",
  muted: "#748092",

  // Brand
  brand: "#48866F",
  onBrand: "#FFFFFF",
  brandPrimary: "#48866F",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FAE7B8",
  onBrandSecondary: "#183044",
  brandTertiary: "#FA7939",
  onBrandTertiary: "#FFFFFF",

  // Status
  success: "#48866F",
  onSuccess: "#FFFFFF",
  warning: "#E9C46A",
  onWarning: "#183044",
  error: "#D9534F",
  onError: "#FFFFFF",
  info: "#183044",
  onInfo: "#FFFFFF",

  // Lines
  border: "#ECEEEB",
  borderStrong: "#D8DCD7",
  divider: "#ECEEEB",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 13,
  lg: 16,
  pill: 999,
};

export const fonts = {
  display: "LibreBaskerville",
  displayRegular: "LibreBaskerville",
  body: "Lato-Regular",
  bodyMedium: "Lato-Bold",
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
