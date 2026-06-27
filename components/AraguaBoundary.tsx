"use client";

import { Polygon } from "react-leaflet";
import { ARAGUA_POLYGON } from "@/lib/aragua-boundary";

export default function AraguaBoundary() {
  return (
    <Polygon
      positions={ARAGUA_POLYGON}
      pathOptions={{
        color: "#dc2626",
        weight: 2.5,
        fillOpacity: 0,
        dashArray: "10 6",
        interactive: false,
      }}
    />
  );
}
