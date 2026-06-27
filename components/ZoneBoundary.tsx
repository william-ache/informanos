"use client";

import { Polygon } from "react-leaflet";
import type { ZonaId } from "@/types/database";
import { ZONA_CONFIG } from "@/lib/zones";

interface ZoneBoundaryProps {
  zona: ZonaId;
}

export default function ZoneBoundary({ zona }: ZoneBoundaryProps) {
  const cfg = ZONA_CONFIG[zona];

  return (
    <Polygon
      positions={cfg.polygon}
      pathOptions={{
        color: cfg.color,
        weight: 2.5,
        fillOpacity: 0,
        dashArray: "10 6",
        interactive: false,
      }}
    />
  );
}
