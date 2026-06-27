export type ConsentimientoPrivacidad = "accepted" | "declined";

const KEY = "informa_privacidad";
export const PRIVACIDAD_EVENT = "informa-privacidad-change";

export function obtenerConsentimientoPrivacidad(): ConsentimientoPrivacidad | null {
  if (typeof window === "undefined") return null;
  const valor = localStorage.getItem(KEY);
  if (valor === "accepted" || valor === "declined") return valor;
  return null;
}

export function guardarConsentimientoPrivacidad(
  valor: ConsentimientoPrivacidad,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, valor);
  window.dispatchEvent(new Event(PRIVACIDAD_EVENT));
}

export function datosExtendidosPermitidos(): boolean {
  return obtenerConsentimientoPrivacidad() === "accepted";
}
