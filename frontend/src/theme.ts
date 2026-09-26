// Waddle Play (PlayPals Connect) design tokens. Light theme only.
// Values sourced from /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#F8F9FA",
  onSurface: "#264653",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#264653",
  surfaceTertiary: "#EAECEE",
  onSurfaceTertiary: "#264653",
  surfaceInverse: "#264653",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6C7A89",

  // Brand
  brand: "#5E876D",
  onBrand: "#FFFFFF",
  brandPrimary: "#5E876D",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E9C46A",
  onBrandSecondary: "#264653",
  brandTertiary: "#F4A261",
  onBrandTertiary: "#264653",

  // Status
  success: "#5E876D",
  onSuccess: "#FFFFFF",
  warning: "#E9C46A",
  onWarning: "#264653",
  error: "#D9534F",
  onError: "#FFFFFF",
  info: "#264653",
  onInfo: "#FFFFFF",

  // Lines
  border: "#EAECEE",
  borderStrong: "#264653",
  divider: "#EAECEE",
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
  md: 12,
  lg: 20,
  pill: 999,
};

export const fonts = {
  display: "Fraunces-Bold",
  displayRegular: "Fraunces-Regular",
  body: "DMSans-Regular",
  bodyMedium: "DMSans-Medium",
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
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
