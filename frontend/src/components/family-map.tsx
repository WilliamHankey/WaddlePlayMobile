import React, { useMemo } from "react";
import WebView from "react-native-webview";
import { familyMapHtml, MapFamily, MapPoint } from "./family-map-html";

export function FamilyMap({ center, families, onSelect }: { center: MapPoint; families: MapFamily[]; onSelect: (id: string) => void }) {
  const html = useMemo(() => familyMapHtml(center, families), [center, families]);
  return <WebView testID="family-map" source={{ html, baseUrl: "https://waddleplay-map.local" }} style={{ flex: 1 }} originWhitelist={["https://*", "about:blank"]} javaScriptEnabled domStorageEnabled={false} geolocationEnabled={false} onShouldStartLoadWithRequest={request => request.url === "about:blank" || request.url.startsWith("https://waddleplay-map.local")} onMessage={event => { try { const message = JSON.parse(event.nativeEvent.data); if (message.source === "waddle-map" && families.some(f => f.id === message.id)) onSelect(message.id); } catch {} }} />;
}
