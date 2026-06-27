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

const DOMINIOS_GOOGLE_MAPS = [
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
];

export function esEnlaceGoogleMaps(texto: string): boolean {
  const input = texto.trim();
  if (!input) return false;

  if (parseGoogleMapsUrl(input)) return true;

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".goo.gl") || host.endsWith(".google.com")) return true;
    return DOMINIOS_GOOGLE_MAPS.includes(host);
  } catch {
    return /google\.(com|[a-z]{2,3})\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(
      input,
    );
  }
}

/**
 * Extrae coordenadas de enlaces o textos de Google Maps.
 */
export function parseGoogleMapsUrl(texto: string): Coordenadas | null {
  const input = texto.trim();
  if (!input) return null;

  const patrones: { re: RegExp; lat: number; lng: number }[] = [
    { re: /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
    { re: /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/, lat: 2, lng: 1 },
    { re: /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,\d|z|$|[/?])/, lat: 1, lng: 2 },
    { re: /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
    { re: /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
    { re: /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
    { re: /[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
    { re: /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/, lat: 1, lng: 2 },
  ];

  for (const { re, lat, lng } of patrones) {
    const match = input.match(re);
    if (match) {
      const coords = parsePair(match[lat], match[lng]);
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

export function urlGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function abrirEnGoogleMaps(lat: number, lng: number): void {
  window.open(urlGoogleMaps(lat, lng), "_blank", "noopener,noreferrer");
}
