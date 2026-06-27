"use client";

import { Polygon } from "react-leaflet";
import { IMPACT_POLYGON } from "@/lib/zones";

export default function ZoneBoundary() {
  return (
    <Polygon
      positions={IMPACT_POLYGON}
      pathOptions={{
        color: "#dc2626",
        weight: 2.5,
        fillColor: "#dc2626",
        fillOpacity: 0.12,
        interactive: false,
      }}
    />
  );
}
