import type { ZonaId } from "@/types/database";

export const ZONAS: ZonaId[] = ["aragua", "caracas"];

export interface ZonaConfig {
  id: ZonaId;
  label: string;
  shortLabel: string;
  center: [number, number];
  zoom: number;
  polygon: [number, number][];
  color: string;
}

/** Polígono simplificado del Estado Aragua [lat, lng] */
export const ARAGUA_POLYGON: [number, number][] = [
  [10.518, -67.745],
  [10.502, -67.485],
  [10.475, -67.285],
  [10.415, -67.035],
  [10.325, -66.815],
  [10.185, -66.775],
  [10.045, -66.825],
  [9.915, -67.055],
  [9.885, -67.355],
  [9.905, -67.565],
  [9.975, -67.755],
  [10.125, -67.855],
  [10.285, -67.885],
  [10.425, -67.815],
  [10.518, -67.745],
];

/** Área metropolitana de Caracas [lat, lng] */
export const CARACAS_POLYGON: [number, number][] = [
  [10.545, -67.080],
  [10.535, -66.780],
  [10.495, -66.745],
  [10.455, -66.760],
  [10.415, -66.820],
  [10.385, -66.920],
  [10.395, -67.020],
  [10.435, -67.080],
  [10.485, -67.095],
  [10.545, -67.080],
];

export const ZONA_CONFIG: Record<ZonaId, ZonaConfig> = {
  aragua: {
    id: "aragua",
    label: "Aragua",
    shortLabel: "Aragua",
    center: [10.25, -67.45],
    zoom: 10,
    polygon: ARAGUA_POLYGON,
    color: "#dc2626",
  },
  caracas: {
    id: "caracas",
    label: "Caracas",
    shortLabel: "Caracas",
    center: [10.48, -66.88],
    zoom: 11,
    polygon: CARACAS_POLYGON,
    color: "#2563eb",
  },
};

function puntoEnPoligono(
  lat: number,
  lng: number,
  polygon: [number, number][],
): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const cruza =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;

    if (cruza) inside = !inside;
  }

  return inside;
}

export function parseZona(value: unknown): ZonaId | null {
  if (value === "aragua" || value === "caracas") return value;
  return null;
}

export function parseZonaParam(value: string | null | undefined): ZonaId {
  return value === "caracas" ? "caracas" : "aragua";
}

export function puntoEnZona(zona: ZonaId, lat: number, lng: number): boolean {
  return puntoEnPoligono(lat, lng, ZONA_CONFIG[zona].polygon);
}

export function detectarZona(lat: number, lng: number): ZonaId | null {
  for (const zona of ZONAS) {
    if (puntoEnZona(zona, lat, lng)) return zona;
  }
  return null;
}

export function mensajeFueraZona(zona: ZonaId): string {
  return `Ubica el lugar dentro de la zona resaltada (${ZONA_CONFIG[zona].label}).`;
}

export function mensajeFueraTodasZonas(): string {
  return "Por ahora solo cubrimos Aragua y Caracas. Ubica el punto dentro de una zona resaltada.";
}
