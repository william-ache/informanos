"use client";

import { formatFechaHumana } from "@/lib/formatFecha";
import {
  AUTOR_SISTEMA,
  esMensajeEliminacion,
  mensajeCentroEliminado,
  mensajeInformaConUbicacion,
} from "@/lib/chat-sistema";
import type { ChatMensaje } from "@/types/database";

interface ChatMensajeCardProps {
  msg: ChatMensaje;
  compact?: boolean;
  onIrACentro?: (centroId: string) => void;
}

export default function ChatMensajeCard({
  msg,
  compact = false,
  onIrACentro,
}: ChatMensajeCardProps) {
  const eliminado = mensajeCentroEliminado(msg);
  const conUbicacion = mensajeInformaConUbicacion(msg) && !!onIrACentro;
  const esSistema = msg.autor === AUTOR_SISTEMA;
  const esEliminacion = esMensajeEliminacion(msg);

  const refCentro = msg.centro_ref ?? msg.centro_id;

  return (
    <article
      role={conUbicacion ? "button" : undefined}
      tabIndex={conUbicacion ? 0 : undefined}
      onClick={
        conUbicacion && refCentro
          ? () => onIrACentro!(refCentro)
          : undefined
      }
      onKeyDown={
        conUbicacion && refCentro
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onIrACentro!(refCentro);
              }
            }
          : undefined
      }
      className={`rounded-xl border px-3 py-2.5 ${
        eliminado || esEliminacion
          ? "border-slate-700 bg-slate-900/50 opacity-75"
          : conUbicacion
            ? "cursor-pointer border-amber-800/50 bg-amber-950/20 hover:bg-amber-950/30 active:bg-amber-950/40"
            : esSistema
              ? "border-amber-800/40 bg-amber-950/15"
              : "border-slate-800 bg-slate-950/70"
      } ${compact ? "" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-semibold ${
            compact ? "text-xs" : "text-sm"
          } ${
            eliminado
              ? "text-slate-500 line-through"
              : esSistema
                ? "text-amber-300"
                : "text-slate-200"
          }`}
        >
          {msg.autor}
        </span>
        <time
          className={`shrink-0 text-slate-500 ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {formatFechaHumana(msg.creado_en)}
        </time>
      </div>
      <p
        className={`mt-1 leading-relaxed text-slate-300 ${
          compact ? "text-sm leading-snug" : "text-sm"
        } ${eliminado ? "text-slate-500" : ""}`}
      >
        {msg.mensaje}
      </p>
      {eliminado && (
        <p className={`mt-1.5 text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>
          Lugar eliminado — no disponible
        </p>
      )}
      {conUbicacion && (
        <p
          className={`mt-1.5 font-medium text-amber-400/90 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          Toca para ver en el mapa →
        </p>
      )}
    </article>
  );
}
