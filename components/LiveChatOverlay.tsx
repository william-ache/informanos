"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useInputActivo } from "@/hooks/use-input-activo";
import { swrDefaults } from "@/lib/swr-config";
import { formatFechaHumana } from "@/lib/formatFecha";
import type { ChatMensaje } from "@/types/database";

const CHAT_KEY = "/api/chat";

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
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const pageVisible = usePageVisible();
  const inputActivo = useInputActivo();

  const { data } = useSWR<ChatResponse>(CHAT_KEY, fetcher, {
    ...swrDefaults,
    refreshInterval: pageVisible && !inputActivo ? 2000 : 0,
  });

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

      setFloats((prev) => [...prev, { ...msg }].slice(-3));

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

  if (floats.length === 0) return null;

  const bottomClass = showNavOffset ? "bottom-[4.75rem]" : "bottom-4";

  return (
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
    </div>
  );
}
