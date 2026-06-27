"use client";

import { useEffect } from "react";
import { reproducirCampanaInforma } from "@/lib/campana-informa";
import { AUTOR_SISTEMA } from "@/lib/chat-sistema-constants";
import type { ChatMensaje } from "@/types/database";

const vistos = new Set<string>();
let inicializado = false;

export function useCampanaInforma(mensajes: ChatMensaje[]): void {
  useEffect(() => {
    if (!mensajes.length) return;

    if (!inicializado) {
      mensajes.forEach((m) => vistos.add(m.id));
      inicializado = true;
      return;
    }

    for (const msg of mensajes) {
      if (vistos.has(msg.id)) continue;
      vistos.add(msg.id);
      if (msg.autor === AUTOR_SISTEMA) {
        reproducirCampanaInforma();
      }
    }
  }, [mensajes]);
}
