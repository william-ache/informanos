export interface Coordenadas {
  lat: number;
  lng: number;
}

function parsePair(lat: string, lng: string): Coordenadas | null {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lng: lo };
}

/**
 * Extrae coordenadas de enlaces o textos de Google Maps.
 */
export function parseGoogleMapsUrl(texto: string): Coordenadas | null {
  const input = texto.trim();
  if (!input) return null;

  const patrones: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,\d|z|$|[/?])/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  ];

  for (const patron of patrones) {
    const match = input.match(patron);
    if (match) {
      const coords = parsePair(match[1], match[2]);
      if (coords) return coords;
    }
  }

  return null;
}

export function parseCoordenadasManuales(
  latTexto: string,
  lngTexto: string,
): Coordenadas | null {
  return parsePair(latTexto.trim(), lngTexto.trim());
}

export function urlGoogleMaps(
  lat: number,
  lng: number,
  etiqueta?: string,
): string {
  const query = etiqueta?.trim()
    ? `${encodeURIComponent(etiqueta)}@${lat},${lng}`
    : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function abrirEnGoogleMaps(
  lat: number,
  lng: number,
  etiqueta?: string,
): void {
  window.open(urlGoogleMaps(lat, lng, etiqueta), "_blank", "noopener,noreferrer");
}
