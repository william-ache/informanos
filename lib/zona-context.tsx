"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mutate } from "swr";
import type { ZonaId } from "@/types/database";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import { centrosKey, chatKey, isCentrosKey, isChatKey } from "@/lib/swr-keys";
import { detectarZona, ZONA_CONFIG } from "@/lib/zones";
import { guardarZona, obtenerZonaGuardada } from "@/lib/zona-storage";

interface ZonaContextValue {
  zona: ZonaId;
  setZona: (zona: ZonaId) => void;
  detectando: boolean;
  autoDetectada: boolean;
  centrosKey: string;
  chatKey: string;
  revalidateCentros: () => Promise<unknown>;
  revalidateChat: () => Promise<unknown>;
}

const ZonaContext = createContext<ZonaContextValue | null>(null);

export function ZonaProvider({ children }: { children: ReactNode }) {
  const [zona, setZonaState] = useState<ZonaId>("aragua");
  const [detectando, setDetectando] = useState(true);
  const [autoDetectada, setAutoDetectada] = useState(false);

  useEffect(() => {
    const guardada = obtenerZonaGuardada();
    if (guardada) {
      setZonaState(guardada);
      setDetectando(false);
      return;
    }

    if (!datosExtendidosPermitidos() || !navigator.geolocation) {
      setDetectando(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectada = detectarZona(pos.coords.latitude, pos.coords.longitude);
        if (detectada) {
          setZonaState(detectada);
          setAutoDetectada(true);
          guardarZona(detectada);
        }
        setDetectando(false);
      },
      () => setDetectando(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  const setZona = useCallback((nueva: ZonaId) => {
    setZonaState(nueva);
    setAutoDetectada(false);
    guardarZona(nueva);
  }, []);

  const revalidateCentros = useCallback(
    () => mutate(isCentrosKey),
    [],
  );

  const revalidateChat = useCallback(() => mutate(isChatKey), []);

  const value = useMemo(
    () => ({
      zona,
      setZona,
      detectando,
      autoDetectada,
      centrosKey: centrosKey(zona),
      chatKey: chatKey(zona),
      revalidateCentros,
      revalidateChat,
    }),
    [zona, setZona, detectando, autoDetectada, revalidateCentros, revalidateChat],
  );

  return <ZonaContext.Provider value={value}>{children}</ZonaContext.Provider>;
}

export function useZonaContext(): ZonaContextValue {
  const ctx = useContext(ZonaContext);
  if (!ctx) {
    throw new Error("useZonaContext debe usarse dentro de ZonaProvider");
  }
  return ctx;
}

export function zonaLabel(zona: ZonaId): string {
  return ZONA_CONFIG[zona].label;
}
