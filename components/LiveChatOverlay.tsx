"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import StreamingChat from "@/components/StreamingChat";
import { fetcher } from "@/lib/fetcher";
import { usePageVisible } from "@/hooks/use-page-visible";
import { swrDefaults } from "@/lib/swr-config";
import { formatFechaHumana } from "@/lib/formatFecha";
import type { ChatMensaje } from "@/types/database";

export const CHAT_KEY = "/api/chat";

interface ChatResponse {
  mensajes: ChatMensaje[];
}

interface FloatMsg extends ChatMensaje {
  fadeOut?: boolean;
}

interface LiveChatOverlayProps {
  showNavOffset?: boolean;
}

export default function LiveChatOverlay({ showNavOffset = true }: LiveChatOverlayProps) {
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const pageVisible = usePageVisible();

  const { data } = useSWR<ChatResponse>(CHAT_KEY, fetcher, {
    ...swrDefaults,
    refreshInterval: pageVisible ? 2000 : 0,
  });

  const total = data?.mensajes.length ?? 0;

  useEffect(() => {
    const mensajes = data?.mensajes;
    if (!mensajes) return;

    if (!readyRef.current) {
      mensajes.forEach((m) => seenRef.current.add(m.id));
      readyRef.current = true;
      return;
    }

    for (const msg of mensajes) {
      if (seenRef.current.has(msg.id)) continue;
      seenRef.current.add(msg.id);

      setFloats((prev) => [...prev, { ...msg }].slice(-4));

      window.setTimeout(() => {
        setFloats((prev) =>
          prev.map((f) => (f.id === msg.id ? { ...f, fadeOut: true } : f)),
        );
        window.setTimeout(() => {
          setFloats((prev) => prev.filter((f) => f.id !== msg.id));
        }, 400);
      }, 7000);
    }
  }, [data]);

  const bottomClass = showNavOffset ? "bottom-[4.75rem]" : "bottom-4";

  return (
    <>
      <div
        className={`pointer-events-none absolute right-3 ${bottomClass} z-[950] flex w-[min(100%,20rem)] flex-col items-end gap-2`}
      >
        {floats.map((msg) => (
          <article
            key={msg.id}
            className={`pointer-events-auto w-full rounded-xl border border-amber-500/40 bg-slate-950/95 px-3 py-2.5 shadow-xl backdrop-blur-sm ${
              msg.fadeOut ? "chat-float-exit" : "chat-float-enter"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-amber-400">{msg.autor}</span>
              <time className="text-[10px] text-slate-500">
                {formatFechaHumana(msg.creado_en)}
              </time>
            </div>
            <p className="mt-1 text-sm leading-snug text-slate-100">{msg.mensaje}</p>
          </article>
        ))}

        <button
          type="button"
          onClick={() => setHistorialAbierto(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg active:scale-95"
        >
          Historial
          {total > 0 && (
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs">{total}</span>
          )}
        </button>
      </div>

      {historialAbierto && (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-slate-950">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3 pt-safe">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Historial en vivo
              </p>
              <p className="text-sm text-slate-400">{total} mensajes recientes</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHistorialAbierto(false);
                void mutate(CHAT_KEY);
              }}
              className="rounded-xl border border-solid border-slate-700 px-4 py-2 text-sm font-semibold active:bg-slate-800"
            >
              Cerrar
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <StreamingChat fullHeight hideHeader />
          </div>
        </div>
      )}
    </>
  );
}
