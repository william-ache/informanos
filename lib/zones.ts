import type { ZonaId } from "@/types/database";

export const ZONAS: ZonaId[] = [
  "aragua",
  "caracas",
  "miranda",
  "carabobo",
  "yaracuy",
];

export interface ZonaConfig {
  id: ZonaId;
  label: string;
  shortLabel: string;
  center: [number, number];
  zoom: number;
  polygon: [number, number][];
  color: string;
}

/** Zona de impacto — polígono general Venezuela central [lat, lng] */
export const IMPACT_POLYGON: [number, number][] = [
  [10.2, -70.0],
  [11.0, -68.7],
  [10.65, -66.6],
  [10.45, -66.3],
  [9.9, -67.3],
  [10.05, -69.2],
  [10.2, -70.0],
];

export const IMPACT_CENTER: [number, number] = [10.42, -67.75];
export const IMPACT_ZOOM = 9;

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

/** Caracas + costa (La Guaira, Maiquetía, etc.) [lat, lng] */
export const CARACAS_POLYGON: [number, number][] = [
  [10.635, -67.055],
  [10.625, -66.995],
  [10.615, -66.955],
  [10.605, -66.915],
  [10.618, -66.865],
  [10.635, -66.805],
  [10.628, -66.755],
  [10.595, -66.725],
  [10.555, -66.735],
  [10.535, -66.78],
  [10.495, -66.745],
  [10.455, -66.76],
  [10.415, -66.82],
  [10.385, -66.92],
  [10.395, -67.02],
  [10.435, -67.08],
  [10.485, -67.095],
  [10.53, -67.085],
  [10.575, -67.07],
  [10.61, -67.06],
  [10.635, -67.055],
];

/** Miranda — zona este del área de impacto [lat, lng] */
export const MIRANDA_POLYGON: [number, number][] = [
  [10.65, -66.6],
  [10.45, -66.3],
  [10.32, -66.55],
  [10.34, -66.82],
  [10.48, -67.0],
  [10.62, -66.88],
  [10.65, -66.6],
];

/** Carabobo — zona sur del área de impacto [lat, lng] */
export const CARABOBO_POLYGON: [number, number][] = [
  [9.9, -67.3],
  [10.05, -69.2],
  [10.18, -68.5],
  [10.22, -67.85],
  [10.15, -67.15],
  [9.9, -67.3],
];

/** Yaracuy — zona noroeste del área de impacto [lat, lng] */
export const YARACUY_POLYGON: [number, number][] = [
  [11.0, -68.7],
  [10.2, -70.0],
  [10.05, -69.2],
  [10.32, -69.05],
  [10.55, -68.88],
  [10.82, -68.74],
  [11.0, -68.7],
];

const ORDEN_DETECCION: ZonaId[] = [
  "caracas",
  "miranda",
  "aragua",
  "carabobo",
  "yaracuy",
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
    center: [10.52, -66.89],
    zoom: 10,
    polygon: CARACAS_POLYGON,
    color: "#2563eb",
  },
  miranda: {
    id: "miranda",
    label: "Miranda",
    shortLabel: "Miranda",
    center: [10.48, -66.55],
    zoom: 10,
    polygon: MIRANDA_POLYGON,
    color: "#7c3aed",
  },
  carabobo: {
    id: "carabobo",
    label: "Carabobo",
    shortLabel: "Carabobo",
    center: [10.08, -68.0],
    zoom: 10,
    polygon: CARABOBO_POLYGON,
    color: "#ea580c",
  },
  yaracuy: {
    id: "yaracuy",
    label: "Yaracuy",
    shortLabel: "Yaracuy",
    center: [10.55, -69.15],
    zoom: 10,
    polygon: YARACUY_POLYGON,
    color: "#059669",
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

export function puntoEnImpacto(lat: number, lng: number): boolean {
  return puntoEnPoligono(lat, lng, IMPACT_POLYGON);
}

export function parseZona(value: unknown): ZonaId | null {
  if (typeof value === "string" && ZONAS.includes(value as ZonaId)) {
    return value as ZonaId;
  }
  return null;
}

export function parseZonaParam(value: string | null | undefined): ZonaId {
  return parseZona(value) ?? "aragua";
}

export function puntoEnZona(zona: ZonaId, lat: number, lng: number): boolean {
  if (!puntoEnImpacto(lat, lng)) return false;
  return detectarZona(lat, lng) === zona;
}

export function detectarZona(lat: number, lng: number): ZonaId | null {
  if (!puntoEnImpacto(lat, lng)) return null;

  for (const zona of ORDEN_DETECCION) {
    if (puntoEnPoligono(lat, lng, ZONA_CONFIG[zona].polygon)) return zona;
  }

  let mejor: ZonaId = "aragua";
  let mejorDist = Infinity;
  for (const zona of ZONAS) {
    const [clat, clng] = ZONA_CONFIG[zona].center;
    const d = (lat - clat) ** 2 + (lng - clng) ** 2;
    if (d < mejorDist) {
      mejorDist = d;
      mejor = zona;
    }
  }
  return mejor;
}

export function mensajeFueraZona(zona: ZonaId): string {
  return `Ubica el lugar dentro de ${ZONA_CONFIG[zona].label} (zona roja del mapa).`;
}

export function mensajeFueraTodasZonas(): string {
  return "Ubica el punto dentro de la zona roja del mapa (Aragua, Caracas, Miranda, Carabobo o Yaracuy).";
}
