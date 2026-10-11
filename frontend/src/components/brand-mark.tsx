import React from "react";
import { View } from "react-native";

// Exact tile arrangement and palette from the mobile canvas brand lockup.
export function BrandMark({ scale = 0.75 }: { scale?: number }) {
  return <View style={{ width: 46 * scale, height: 47 * scale }}>{[[28, 0, "#EBC773"], [14, 12, "#C0CD9D"], [0, 24, "#B5C6C1"], [14, 36, "#AABCC0"]].map(([x, y, color], index) => <View key={index} style={{ position: "absolute", left: Number(x) * scale, top: Number(y) * scale, width: 18 * scale, height: 11 * scale, borderRadius: 4 * scale, backgroundColor: String(color) }} />)}</View>;
}
