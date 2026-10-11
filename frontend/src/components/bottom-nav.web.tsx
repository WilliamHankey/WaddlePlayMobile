import React, { useSyncExternalStore } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNavContent, type NavLabel } from "./bottom-nav-content";

export { NAV_ITEMS } from "./bottom-nav-content";
export type { NavLabel } from "./bottom-nav-content";

function subscribeViewport(update: () => void) {
  const viewport = window.visualViewport;
  window.addEventListener("resize", update);
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  return () => {
    window.removeEventListener("resize", update);
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
  };
}
function viewportBottom() {
  const viewport = window.visualViewport;
  return viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
}
const serverBottom = () => -1;

/** Keep the menu in the app tree and fixed to the visible browser viewport. */
export function BottomNav({ active }: { active: NavLabel }) {
  const insets = useSafeAreaInsets();
  const bottom = useSyncExternalStore(subscribeViewport, viewportBottom, serverBottom);
  return (
    <>
      <View style={{ height: 60 + insets.bottom, flexShrink: 0 }} />
      <nav aria-label="Main navigation" data-testid="bottom-navigation-container" style={{ position: "fixed", left: 0, right: 0, bottom: Math.max(0, bottom), zIndex: 1000, isolation: "isolate" }}>
        <BottomNavContent active={active} />
      </nav>
    </>
  );
}
