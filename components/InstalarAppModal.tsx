"use client";

import { useState } from "react";
import ModalPortal from "@/components/ModalPortal";

interface InstalarAppModalProps {
  open: boolean;
  esIos: boolean;
  onClose: () => void;
  onInstalar: () => Promise<boolean>;
}

export default function InstalarAppModal({
  open,
  esIos,
  onClose,
  onInstalar,
}: InstalarAppModalProps) {
  const [instalando, setInstalando] = useState(false);

  async function instalar() {
    setInstalando(true);
    try {
      if (esIos) {
        onClose();
        return;
      }
      const ok = await onInstalar();
      if (ok) onClose();
    } finally {
      setInstalando(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[9998] flex items-end bg-black/70 lg:items-center lg:justify-center lg:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-2xl bg-slate-900 p-5 pb-safe shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 lg:hidden" />
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Acceso rápido
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Instalar Informa Aragua
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Agrega un acceso directo en la pantalla de inicio de tu celular para
            abrir el mapa y los centros de acopio al instante.
          </p>

          {esIos ? (
            <ol className="mt-4 space-y-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300">
              <li>1. Toca el botón <strong>Compartir</strong> del navegador.</li>
              <li>2. Elige <strong>Añadir a inicio</strong> o <strong>Add to Home Screen</strong>.</li>
              <li>3. Confirma con <strong>Añadir</strong>.</li>
            </ol>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
              Se instalará como app web. No ocupa mucho espacio y funciona sin
              descargar de una tienda.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={instalando}
              onClick={() => void instalar()}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white active:bg-emerald-500 disabled:opacity-60"
            >
              {instalando
                ? "Instalando…"
                : esIos
                  ? "Entendido"
                  : "Instalar en inicio"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-slate-500"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
