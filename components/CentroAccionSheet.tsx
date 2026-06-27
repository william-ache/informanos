"use client";

import ModalPortal from "@/components/ModalPortal";
import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import type { CentroAcopio } from "@/types/database";

interface CentroAccionSheetProps {
  centro: CentroAcopio | null;
  onCerrar: () => void;
  onReportar: (centro: CentroAcopio) => void;
  onVerLista: (centro: CentroAcopio) => void;
}

export default function CentroAccionSheet({
  centro,
  onCerrar,
  onReportar,
  onVerLista,
}: CentroAccionSheetProps) {
  if (!centro) return null;

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[9999] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
        onClick={onCerrar}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-2xl bg-slate-900 p-5 pb-safe shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700 lg:hidden" />
          <p className="text-lg font-bold">{centro.nombre}</p>
          <p className="mt-1 text-sm text-slate-400">{centro.municipio}</p>
          {centro.contacto && (
            <div className="mt-2 flex flex-wrap gap-2">
              {centro.contacto.split(",").map((tel) => {
                const limpio = tel.trim();
                if (!limpio) return null;
                return (
                  <a
                    key={limpio}
                    href={`tel:${limpio.replace(/\s/g, "")}`}
                    className="text-sm text-blue-400 underline"
                  >
                    {limpio}
                  </a>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                abrirEnGoogleMaps(centro.latitud, centro.longitud)
              }
              className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white active:bg-blue-500"
            >
              Ver en Google Maps
            </button>
            <button
              type="button"
              onClick={() => onReportar(centro)}
              className="w-full rounded-xl bg-red-600 py-3.5 text-base font-bold text-white active:bg-red-500"
            >
              Reportar necesidad aquí
            </button>
            <button
              type="button"
              onClick={() => onVerLista(centro)}
              className="w-full rounded-xl border border-slate-700 py-3.5 text-base font-semibold active:bg-slate-800"
            >
              Ver detalle y votos
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="w-full py-2 text-sm text-slate-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
