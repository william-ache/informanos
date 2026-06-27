import type { CentroAcopio } from "@/types/database";

export type ClaveAyudaSolicitada =
  | "solicita_transporte"
  | "solicita_medico"
  | "solicita_voluntarios"
  | "solicita_psicologo"
  | "solicita_veterinario";

export interface AyudaSolicitada {
  solicita_transporte: boolean;
  solicita_medico: boolean;
  solicita_voluntarios: boolean;
  solicita_psicologo: boolean;
  solicita_veterinario: boolean;
}

export const AYUDAS_SOLICITADAS: {
  key: ClaveAyudaSolicitada;
  label: string;
  emoji: string;
}[] = [
  { key: "solicita_transporte", label: "Transporte", emoji: "🚐" },
  { key: "solicita_medico", label: "Personal médico", emoji: "🩺" },
  { key: "solicita_voluntarios", label: "Ayuda voluntaria", emoji: "🤝" },
  { key: "solicita_psicologo", label: "Psicólogo", emoji: "🧠" },
  { key: "solicita_veterinario", label: "Veterinario", emoji: "🐾" },
];

export const ayudaSolicitadaVacia: AyudaSolicitada = {
  solicita_transporte: false,
  solicita_medico: false,
  solicita_voluntarios: false,
  solicita_psicologo: false,
  solicita_veterinario: false,
};

export function ayudaDesdeCentro(centro: CentroAcopio): AyudaSolicitada {
  return {
    solicita_transporte: Boolean(centro.solicita_transporte),
    solicita_medico: Boolean(centro.solicita_medico),
    solicita_voluntarios: Boolean(centro.solicita_voluntarios),
    solicita_psicologo: Boolean(centro.solicita_psicologo),
    solicita_veterinario: Boolean(centro.solicita_veterinario),
  };
}

export function parseAyudaBody(body: Record<string, unknown>): Partial<AyudaSolicitada> {
  const out: Partial<AyudaSolicitada> = {};
  for (const { key } of AYUDAS_SOLICITADAS) {
    if (key in body) out[key] = body[key] === true;
  }
  return out;
}

export function tieneAlgunaAyuda(ayuda: AyudaSolicitada): boolean {
  return AYUDAS_SOLICITADAS.some(({ key }) => ayuda[key]);
}

export function resumenAyudaSolicitada(centro: CentroAcopio): string {
  const partes = AYUDAS_SOLICITADAS.filter(({ key }) => centro[key]).map(
    ({ emoji, label }) => `${emoji} ${label}`,
  );
  return partes.join(" · ");
}

export function etiquetaAyuda(key: ClaveAyudaSolicitada): string {
  return AYUDAS_SOLICITADAS.find((a) => a.key === key)?.label ?? key;
}

export function cambiosAyudaTexto(
  antes: AyudaSolicitada,
  despues: AyudaSolicitada,
): string[] {
  const cambios: string[] = [];
  for (const { key, label } of AYUDAS_SOLICITADAS) {
    if (antes[key] === despues[key]) continue;
    cambios.push(
      despues[key] ? `Solicita ${label.toLowerCase()}` : `Ya no solicita ${label.toLowerCase()}`,
    );
  }
  return cambios;
}

export function cambiosPoblacionTexto(
  antes: {
    aprox_ninos: number | null;
    aprox_personas: number | null;
    aprox_ancianos: number | null;
    aprox_animales: number | null;
  },
  despues: {
    aprox_ninos: number | null;
    aprox_personas: number | null;
    aprox_ancianos: number | null;
    aprox_animales: number | null;
  },
): string[] {
  const cambios: string[] = [];
  const campos: [string, keyof typeof antes][] = [
    ["niños", "aprox_ninos"],
    ["personas", "aprox_personas"],
    ["ancianos", "aprox_ancianos"],
    ["animales", "aprox_animales"],
  ];
  for (const [label, key] of campos) {
    if (antes[key] !== despues[key]) {
      cambios.push(`${label}: ${despues[key] ?? "—"}`);
    }
  }
  return cambios;
}

export function mensajeChatEdicionCentro(
  nombre: string,
  lineas: string[],
): string {
  if (lineas.length === 0) {
    return `✏️ Datos actualizados en «${nombre}»`;
  }
  const detalle = lineas.slice(0, 6).join(" · ");
  return `✏️ «${nombre}»: ${detalle}`;
}
