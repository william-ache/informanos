export const INSUMO_OPCIONES = [
  { value: "agua", label: "Agua" },
  { value: "medicamento", label: "Medicamento" },
  { value: "comida", label: "Comida" },
  { value: "ropa", label: "Ropa" },
  { value: "higiene", label: "Higiene" },
  { value: "otro", label: "Otro", sublabel: "Escribir manualmente" },
] as const;

export type TipoInsumo = (typeof INSUMO_OPCIONES)[number]["value"];

export function elementoDesdeInsumo(tipo: string, otro: string): string {
  if (tipo === "otro") return otro.trim();
  const opcion = INSUMO_OPCIONES.find((o) => o.value === tipo);
  return opcion?.label ?? otro.trim();
}

export function insumoValido(tipo: string, otro: string): boolean {
  if (!tipo) return false;
  if (tipo === "otro") return otro.trim().length > 0;
  return true;
}
