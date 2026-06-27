"use client";

import { useEffect, useState } from "react";
import {
  obtenerConsentimientoPrivacidad,
  PRIVACIDAD_EVENT,
  type ConsentimientoPrivacidad,
} from "@/lib/privacidad";

export function usePrivacidad() {
  const [consentimiento, setConsentimiento] =
    useState<ConsentimientoPrivacidad | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setConsentimiento(obtenerConsentimientoPrivacidad());
    setListo(true);

    const actualizar = () =>
      setConsentimiento(obtenerConsentimientoPrivacidad());
    window.addEventListener(PRIVACIDAD_EVENT, actualizar);
    return () => window.removeEventListener(PRIVACIDAD_EVENT, actualizar);
  }, []);

  return {
    listo,
    consentimiento,
    pendiente: listo && consentimiento === null,
    datosExtendidos: consentimiento === "accepted",
  };
}
