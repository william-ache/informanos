const DISMISS_KEY = "informa_pwa_install_dismiss";
const PENDING_KEY = "informa_pwa_install_pending";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notificar() {
  listeners.forEach((cb) => cb());
}

export function capturarPromptInstalacion(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notificar();
}

export function obtenerPromptInstalacion(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function limpiarPromptInstalacion(): void {
  deferredPrompt = null;
  notificar();
}

export function suscribirPromptInstalacion(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function esAppInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function esIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const msStream = (window as Window & { MSStream?: unknown }).MSStream;
  return ios && !msStream;
}

export function instalacionDescartada(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function marcarInstalacionDescartada(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, "1");
  sessionStorage.removeItem(PENDING_KEY);
}

export function marcarInstalacionPendiente(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_KEY, "1");
}

export function consumirInstalacionPendiente(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(PENDING_KEY) !== "1") return false;
  sessionStorage.removeItem(PENDING_KEY);
  return true;
}

export function puedeMostrarInstalacion(): boolean {
  if (esAppInstalada() || instalacionDescartada()) return false;
  return !!obtenerPromptInstalacion() || esIosSafari();
}
