"use client";

import ModalPortal from "@/components/ModalPortal";
import { GITHUB_URL } from "@/lib/site";
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
          <h2 className="mt-1 text-xl font-bold">Términos y privacidad</h2>

          <section className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3">
            <h3 className="text-sm font-bold text-amber-300">
              Términos de uso — herramienta comunitaria
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              <strong>Informa Aragua es solo un intermediario técnico.</strong>{" "}
              El operador de esta plataforma{" "}
              <strong>no sube, edita ni garantiza</strong> la información
              publicada y <strong>no tiene la intención de desinformar</strong>.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Todos los datos del sistema — centros de acopio, necesidades,
              mensajes del chat, votos y reportes — son{" "}
              <strong>
                cargados, modificados y actualizados por los propios usuarios
              </strong>
              . La plataforma facilita la coordinación; la responsabilidad del
              contenido recae en quien lo publica.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Proyecto sin fines de lucro:{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 underline"
              >
                {GITHUB_URL}
              </a>
            </p>
          </section>

          <section className="mt-4">
            <h3 className="text-sm font-bold text-slate-200">
              Política de privacidad
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Para mantener datos útiles en emergencias, la plataforma puede usar
              información limitada de tu dispositivo:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-400">
              <li>
                · Ubicación aproximada (votos, chat y reportes, solo si aceptas)
              </li>
              <li>· Sesión anónima para contar usuarios en línea</li>
              <li>· Nombre que escribas en el chat o reportes</li>
              <li>· Datos técnicos del navegador al reportar errores</li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              No vendemos tus datos. Solo los usamos para validar información,
              corregir errores y mejorar el servicio durante la emergencia.
            </p>
            <p className="mt-2 text-sm text-amber-300/90">
              Si no aceptas, la app sigue funcionando con funciones limitadas
              (sin ubicación ni presencia en línea). No se bloqueará el acceso.
            </p>
          </section>

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
