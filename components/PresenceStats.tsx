"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrDefaults } from "@/lib/swr-config";
import { usePageVisible } from "@/hooks/use-page-visible";

const PRESENCE_KEY = "/api/presence";
const HEARTBEAT_MS = 15000;

interface PresenceStats {
  enLinea: number;
}

function obtenerSessionId(): string {
  const key = "informa_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

async function enviarHeartbeat(): Promise<PresenceStats> {
  const res = await fetch(PRESENCE_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: obtenerSessionId() }),
  });

  if (!res.ok) {
    throw new Error("No se pudo registrar presencia.");
  }

  return res.json() as Promise<PresenceStats>;
}

export default function PresenceStats() {
  const pageVisible = usePageVisible();
  const [conectado, setConectado] = useState(false);

  const { data } = useSWR<PresenceStats>(
    pageVisible ? PRESENCE_KEY : null,
    fetcher,
    {
      ...swrDefaults,
      refreshInterval: pageVisible ? 10000 : 0,
    },
  );

  useEffect(() => {
    if (!pageVisible) return;

    const ping = () => {
      enviarHeartbeat()
        .then((stats) => {
          setConectado(true);
          void mutate(PRESENCE_KEY, stats, { revalidate: false });
        })
        .catch(() => {
          setConectado(false);
        });
    };

    ping();
    const id = window.setInterval(ping, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [pageVisible]);

  const enLinea = data?.enLinea ?? 0;

  return (
    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
      <span className="inline-flex items-center gap-1">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            conectado ? "animate-pulse bg-emerald-400" : "bg-slate-600"
          }`}
        />
        {enLinea} en línea
      </span>
    </p>
  );
}
