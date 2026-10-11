import React, { useEffect, useMemo, useRef } from "react";
import { familyMapHtml, MapFamily, MapPoint } from "./family-map-html";

export function FamilyMap({ center, families, onSelect }: { center: MapPoint; families: MapFamily[]; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => familyMapHtml(center, families), [center, families]);
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.source === ref.current?.contentWindow && event.data?.source === "waddle-map" && families.some(f => f.id === event.data.id)) onSelect(event.data.id); };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [families, onSelect]);
  return <iframe ref={ref} title="Nearby verified families, approximate locations" srcDoc={html} sandbox="allow-scripts" style={{ flex: 1, width: "100%", height: "100%", border: 0, minHeight: 260 }} />;
}
