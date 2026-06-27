import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api";
import { esEnlaceGoogleMaps } from "@/lib/google-maps-url";
import { resolverEnlaceGoogleMaps } from "@/lib/google-maps-resolver";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "Falta el enlace de Google Maps." }, { status: 400 });
    }

    if (!esEnlaceGoogleMaps(url)) {
      return NextResponse.json(
        { error: "El texto no parece un enlace de Google Maps." },
        { status: 400 },
      );
    }

    const resultado = await resolverEnlaceGoogleMaps(url);

    if (!resultado) {
      return NextResponse.json(
        {
          error:
            "No pudimos obtener coordenadas de ese enlace. Prueba abrir el enlace en el navegador, copiar la URL larga y pegarla aquí.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      lat: resultado.lat,
      lng: resultado.lng,
      urlFinal: resultado.urlFinal,
    });
  } catch (error) {
    console.error("[google-maps/resolve]", error);
    return NextResponse.json(
      { error: "Error al procesar el enlace. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
