"use client";

import { Polygon } from "react-leaflet";
import { IMPACT_POLYGON, ZONA_CONFIG } from "@/lib/zones";
import type { ZonaId } from "@/types/database";

interface ZoneBoundaryProps {
  zona: ZonaId;
}

export default function ZoneBoundary({ zona }: ZoneBoundaryProps) {
  const cfg = ZONA_CONFIG[zona];

  return (
    <>
      <Polygon
        positions={IMPACT_POLYGON}
        pathOptions={{
          color: "#dc2626",
          weight: 2.5,
          fillOpacity: 0,
          interactive: false,
        }}
      />
      <Polygon
        positions={cfg.polygon}
        pathOptions={{
          color: cfg.color,
          weight: 2,
          fillColor: cfg.color,
          fillOpacity: 0.18,
          interactive: false,
        }}
      />
    </>
  );
}
