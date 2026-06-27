"use client";

import { useCallback, useEffect, useState } from "react";
import {
  capturarPromptInstalacion,
  esAppInstalada,
  esIosSafari,
  instalacionDescartada,
  limpiarPromptInstalacion,
  obtenerPromptInstalacion,
  suscribirPromptInstalacion,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [listo, setListo] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [tienePrompt, setTienePrompt] = useState(false);
  const [esIos, setEsIos] = useState(false);

  const actualizar = useCallback(() => {
    setInstalada(esAppInstalada());
    setTienePrompt(!!obtenerPromptInstalacion());
    setEsIos(esIosSafari());
    setListo(true);
  }, []);

  useEffect(() => {
    actualizar();

    window.addEventListener("beforeinstallprompt", capturarPromptInstalacion);
    const desuscribir = suscribirPromptInstalacion(actualizar);

    return () => {
      window.removeEventListener("beforeinstallprompt", capturarPromptInstalacion);
      desuscribir();
    };
  }, [actualizar]);

  const puedeOfrecer =
    listo && !instalada && !instalacionDescartada() && (tienePrompt || esIos);

  const instalar = useCallback(async () => {
    const prompt = obtenerPromptInstalacion();
    if (!prompt) return false;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    limpiarPromptInstalacion();
    actualizar();

    if (outcome === "accepted") {
      setInstalada(true);
      return true;
    }
    return false;
  }, [actualizar]);

  return { puedeOfrecer, instalada, esIos, tienePrompt, instalar };
}
