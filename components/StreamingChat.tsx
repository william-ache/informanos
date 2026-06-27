"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrDefaults } from "@/lib/swr-config";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useInputActivo } from "@/hooks/use-input-activo";
import { useCampanaInforma } from "@/hooks/use-campana-informa";
import {
  guardarChatAutor,
  limpiarChatAutor,
  obtenerChatAutor,
} from "@/lib/chat-autor";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import { chatKey } from "@/lib/swr-keys";
import { zonaLabel } from "@/lib/zona-context";
import ChatMensajeCard from "@/components/ChatMensajeCard";
import type { ChatMensaje, ZonaId } from "@/types/database";

interface ChatResponse {
  mensajes: ChatMensaje[];
}

interface StreamingChatProps {
  zona: ZonaId;
  fullHeight?: boolean;
  hideHeader?: boolean;
  onIrACentro?: (centroId: string) => void;
}

export default function StreamingChat({
  zona,
  fullHeight = false,
  hideHeader = false,
  onIrACentro,
}: StreamingChatProps) {
  const [autor, setAutor] = useState("");
  const [nombrePersistido, setNombrePersistido] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const pageVisible = usePageVisible();
  const inputActivo = useInputActivo();
  const chatUrl = chatKey(zona);

  const { data, error: swrError, isLoading } = useSWR<ChatResponse>(
    chatUrl,
    fetcher,
    {
      ...swrDefaults,
      refreshInterval: pageVisible && !inputActivo ? 2000 : 0,
    },
  );

  const mensajes = data?.mensajes ?? [];
  const nombreGuardado = nombrePersistido && !editandoNombre;

  useCampanaInforma(mensajes);

  useEffect(() => {
    const guardado = obtenerChatAutor();
    if (guardado) {
      setAutor(guardado);
      setNombrePersistido(true);
    }
  }, []);

  useEffect(() => {
    if (inputActivo) return;
    listaRef.current?.scrollTo({
      top: listaRef.current.scrollHeight,
    });
  }, [mensajes.length, inputActivo]);

  async function enviarMensaje(event: React.FormEvent) {
    event.preventDefault();
    const nombre = autor.trim();
    if (!nombre) return;

    setEnviando(true);
    setError(null);
    guardarChatAutor(nombre);
    setNombrePersistido(true);
    setEditandoNombre(false);

    let latitud: number | null = null;
    let longitud: number | null = null;

    if (datosExtendidosPermitidos() && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 4000,
            maximumAge: 60000,
          });
        });
        latitud = pos.coords.latitude;
        longitud = pos.coords.longitude;
      } catch {
        // coords opcionales
      }
    }

    try {
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autor: nombre,
          mensaje: mensaje.trim(),
          latitud,
          longitud,
          zona,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo enviar el mensaje.");
      }

      setMensaje("");
      await mutate(chatUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section
      className={`flex flex-col bg-slate-900 ${
        fullHeight ? "h-full" : "min-h-48 border-t border-slate-800"
      }`}
    >
      {!fullHeight && !hideHeader && (
        <header className="border-b border-slate-800 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Chat en vivo · {zonaLabel(zona)}
          </p>
        </header>
      )}

      <div
        ref={listaRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {isLoading && (
          <p className="text-sm text-slate-500">Cargando mensajes…</p>
        )}
        {(swrError || error) && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error ?? (swrError instanceof Error ? swrError.message : "Error de chat")}
          </p>
        )}
        {!isLoading && mensajes.length === 0 && (
          <p className="text-sm text-slate-500">Sin mensajes aún.</p>
        )}
        {mensajes.map((msg) => (
          <ChatMensajeCard key={msg.id} msg={msg} onIrACentro={onIrACentro} />
        ))}
      </div>

      <form onSubmit={enviarMensaje} className="border-t border-slate-800 bg-slate-950 p-3 pb-safe">
        {nombreGuardado && (
          <div className="mb-2 flex items-center justify-between gap-2 text-sm text-slate-400">
            <span>
              Como <strong className="text-slate-200">{autor}</strong>
            </span>
            <button
              type="button"
              onClick={() => setEditandoNombre(true)}
              className="text-xs text-amber-400 underline"
            >
              Cambiar
            </button>
          </div>
        )}

        {!nombreGuardado && !editandoNombre && (
          <input
            required
            type="text"
            autoComplete="off"
            placeholder="Tu nombre"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-amber-500"
          />
        )}

        {editandoNombre && (
          <div className="mb-2 flex gap-2">
            <input
              autoFocus
              type="text"
              autoComplete="off"
              placeholder="Tu nombre"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                const nombre = autor.trim();
                if (nombre) {
                  guardarChatAutor(nombre);
                  setNombrePersistido(true);
                } else {
                  setAutor(obtenerChatAutor());
                }
                setEditandoNombre(false);
              }}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-amber-400"
            >
              Listo
            </button>
            <button
              type="button"
              onClick={() => {
                setAutor(obtenerChatAutor());
                setEditandoNombre(false);
              }}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                limpiarChatAutor();
                setAutor("");
                setNombrePersistido(false);
                setEditandoNombre(false);
              }}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-red-400"
            >
              Borrar
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            required
            type="text"
            autoComplete="off"
            placeholder="Mensaje de emergencia…"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={enviando || !autor.trim()}
            className="shrink-0 rounded-xl bg-amber-600 px-5 py-3 text-base font-bold text-white active:bg-amber-500 disabled:opacity-50"
          >
            {enviando ? "…" : "→"}
          </button>
        </div>
      </form>
    </section>
  );
}
