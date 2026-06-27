"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useInputActivo } from "@/hooks/use-input-activo";
import { useCampanaInforma } from "@/hooks/use-campana-informa";
import { swrDefaults } from "@/lib/swr-config";
import { chatKey } from "@/lib/swr-keys";
import ChatMensajeCard from "@/components/ChatMensajeCard";
import type { ChatMensaje, ZonaId } from "@/types/database";

interface ChatResponse {
  mensajes: ChatMensaje[];
}

interface FloatMsg extends ChatMensaje {
  fadeOut?: boolean;
}

interface LiveChatOverlayProps {
  zona: ZonaId;
  showNavOffset?: boolean;
  onIrACentro?: (centroId: string) => void;
}

export default function LiveChatOverlay({
  zona,
  showNavOffset = true,
  onIrACentro,
}: LiveChatOverlayProps) {
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const pageVisible = usePageVisible();
  const inputActivo = useInputActivo();
  const chatUrl = chatKey(zona);

  const { data } = useSWR<ChatResponse>(chatUrl, fetcher, {
    ...swrDefaults,
    refreshInterval: pageVisible && !inputActivo ? 2000 : 0,
  });

  const mensajes = data?.mensajes ?? [];
  useCampanaInforma(mensajes);

  useEffect(() => {
    seenRef.current.clear();
    readyRef.current = false;
    setFloats([]);
  }, [zona]);

  useEffect(() => {
    if (!mensajes.length) return;

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
  }, [mensajes]);

  if (floats.length === 0) return null;

  const bottomClass = showNavOffset ? "bottom-[4.75rem]" : "bottom-4";

  return (
    <div
      className={`pointer-events-none absolute right-3 ${bottomClass} z-[950] flex w-[min(100%,20rem)] flex-col items-end gap-2`}
    >
      {floats.map((msg) => (
        <div
          key={msg.id}
          className={`pointer-events-auto w-full ${
            msg.fadeOut ? "chat-float-exit" : "chat-float-enter"
          }`}
        >
          <ChatMensajeCard msg={msg} compact onIrACentro={onIrACentro} />
        </div>
      ))}
    </div>
  );
}
