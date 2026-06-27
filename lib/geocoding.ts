export interface LugarDetectado {
  nombre: string;
  municipio: string;
  direccion: string;
}

interface NominatimAddress {
  amenity?: string;
  building?: string;
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

function primerValor(...valores: (string | undefined)[]): string {
  for (const v of valores) {
    if (v?.trim()) return v.trim();
  }
  return "";
}

export async function detectarLugar(
  lat: number,
  lng: number,
): Promise<LugarDetectado | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
      addressdetails: "1",
      "accept-language": "es",
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResponse;
    const addr = data.address ?? {};

    const municipio = primerValor(
      addr.municipality,
      addr.city,
      addr.town,
      addr.village,
      addr.county,
      addr.suburb,
    );

    const calle = primerValor(addr.road, addr.neighbourhood);
    const numero = addr.house_number?.trim();
    const direccion = [calle, numero].filter(Boolean).join(" ") || primerValor(data.display_name?.split(",")[0]);

    const nombre = primerValor(
      addr.amenity,
      addr.building,
      data.name,
      calle,
      municipio,
      "Lugar de ayuda",
    );

    return { nombre, municipio, direccion };
  } catch {
    return null;
  }
}
