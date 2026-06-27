import {
  ARAGUA_POLYGON,
  mensajeFueraZona,
  puntoEnZona,
} from "@/lib/zones";

export { ARAGUA_POLYGON };

export function puntoEnAragua(lat: number, lng: number): boolean {
  return puntoEnZona("aragua", lat, lng);
}

export const MENSAJE_FUERA_ARAGUA = mensajeFueraZona("aragua");
