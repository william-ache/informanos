import { calcularDistanciaMetros } from "@/lib/geo";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import type { CentroAcopio } from "@/types/database";

const GEOCERCA_METROS = 500;

function obtenerUbicacion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export async function resolverVotoPresencial(
  centro: CentroAcopio,
): Promise<{ continuar: boolean; esTestigo: boolean }> {
  if (datosExtendidosPermitidos()) {
    try {
      const pos = await obtenerUbicacion();
      const distancia = calcularDistanciaMetros(
        pos.coords.latitude,
        pos.coords.longitude,
        centro.latitud,
        centro.longitud,
      );

      if (distancia !== null && distancia <= GEOCERCA_METROS) {
        return { continuar: true, esTestigo: true };
      }

      if (distancia !== null && distancia > GEOCERCA_METROS) {
        const continuar = window.confirm(
          `Estás a ~${distancia} m. ¿Confirmas información verídica de primera mano?`,
        );
        return { continuar, esTestigo: false };
      }

      const continuar = window.confirm(
        "No pudimos calcular tu distancia. ¿Confirmas que tu información es verídica?",
      );
      return { continuar, esTestigo: false };
    } catch {
      const continuar = window.confirm(
        "¿Confirmas que tu información es verídica? (Sin ubicación, voto normal.)",
      );
      return { continuar, esTestigo: false };
    }
  }

  const continuar = window.confirm("¿Confirmas que tu información es verídica?");
  return { continuar, esTestigo: false };
}
