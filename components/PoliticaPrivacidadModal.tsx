"use client";

import ModalPortal from "@/components/ModalPortal";
import {
  guardarConsentimientoPrivacidad,
  type ConsentimientoPrivacidad,
} from "@/lib/privacidad";

interface PoliticaPrivacidadModalProps {
  open: boolean;
}

export default function PoliticaPrivacidadModal({
  open,
}: PoliticaPrivacidadModalProps) {
  function elegir(valor: ConsentimientoPrivacidad) {
    guardarConsentimientoPrivacidad(valor);
  }

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[9999] flex items-end bg-black/70 lg:items-center lg:justify-center lg:p-4">
        <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-5 pb-safe text-slate-100 shadow-2xl lg:max-w-lg lg:rounded-2xl lg:pb-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 lg:hidden" />
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">
            Informa Aragua
          </p>
          <h2 className="mt-1 text-xl font-bold">Política de privacidad</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Para mantener datos confiables en emergencias, la plataforma puede
            usar información limitada de tu dispositivo:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>· Ubicación aproximada (votos, chat y reportes, solo si aceptas)</li>
            <li>· Sesión anónima para contar usuarios en línea</li>
            <li>· Nombre que escribas en el chat o reportes</li>
            <li>· Datos técnicos del navegador al reportar errores</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            No vendemos tus datos. Solo los usamos para validar información,
            corregir errores y mejorar el servicio durante la emergencia.
          </p>
          <p className="mt-3 text-sm text-amber-300/90">
            Si no aceptas, la app sigue funcionando con funciones limitadas (sin
            ubicación ni presencia en línea). No se bloqueará el acceso.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => elegir("declined")}
              className="flex-1 rounded-xl border border-slate-600 py-3.5 text-base font-semibold text-slate-300 active:bg-slate-800"
            >
              No acepto
            </button>
            <button
              type="button"
              onClick={() => elegir("accepted")}
              className="flex-1 rounded-xl bg-red-600 py-3.5 text-base font-bold text-white active:bg-red-500"
            >
              Acepto y continuar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
