import {
  esEnlaceGoogleMaps,
  parseGoogleMapsUrl,
  type Coordenadas,
} from "@/lib/google-maps-url";

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

export interface ResultadoResolucion extends Coordenadas {
  urlFinal: string;
}

function extraerUrlMapsDeHtml(html: string): string | null {
  const candidatos = [
    html.match(/property="og:url"\s+content="([^"]+)"/i)?.[1],
    html.match(/content="(https:\/\/[^"]*google[^"]*\/maps[^"]*)"/i)?.[1],
    html.match(/"(https:\/\/www\.google\.com\/maps[^"\\]+)"/)?.[1],
    html.match(/"(https:\/\/maps\.google\.com[^"\\]+)"/)?.[1],
  ];

  for (const raw of candidatos) {
    if (!raw) continue;
    const limpio = raw.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    if (parseGoogleMapsUrl(limpio) || limpio.includes("google")) return limpio;
  }

  return null;
}

async function fetchConTimeout(
  url: string,
  init: RequestInit,
  ms = 12000,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

async function seguirRedirecciones(inicio: string, maxSaltos = 10): Promise<string> {
  let url = inicio;

  for (let i = 0; i < maxSaltos; i++) {
    const coords = parseGoogleMapsUrl(url);
    if (coords) return url;

    let res: Response;
    try {
      res = await fetchConTimeout(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-VE,es;q=0.9",
        },
      });
    } catch {
      break;
    }

    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get("location");
      if (!destino) break;
      url = new URL(destino, url).href;
      continue;
    }

    if (res.ok) {
      const html = await res.text();
      const embebida = extraerUrlMapsDeHtml(html);
      if (embebida && embebida !== url) {
        url = embebida;
        continue;
      }
    }

    break;
  }

  return url;
}

export async function resolverEnlaceGoogleMaps(
  input: string,
): Promise<ResultadoResolucion | null> {
  const texto = input.trim();
  if (!texto) return null;

  const directo = parseGoogleMapsUrl(texto);
  if (directo) return { ...directo, urlFinal: texto };

  if (!esEnlaceGoogleMaps(texto)) return null;

  let urlObjetivo = texto;
  if (!/^https?:\/\//i.test(urlObjetivo)) {
    urlObjetivo = `https://${urlObjetivo}`;
  }

  const urlFinal = await seguirRedirecciones(urlObjetivo);
  const coords = parseGoogleMapsUrl(urlFinal);
  if (!coords) return null;

  return { ...coords, urlFinal };
}
