import { AUTOR_SISTEMA } from "@/lib/chat-sistema-constants";
import type { ChatMensaje } from "@/types/database";

export { AUTOR_SISTEMA } from "@/lib/chat-sistema-constants";

export function refCentroChat(msg: Pick<ChatMensaje, "centro_id" | "centro_ref">): string | null {
  return msg.centro_ref ?? msg.centro_id;
}

export function mensajeInformaConUbicacion(msg: ChatMensaje): boolean {
  if (msg.autor !== AUTOR_SISTEMA) return false;
  const ref = refCentroChat(msg);
  if (!ref) return false;
  return msg.centro_activo !== false;
}

export function mensajeCentroEliminado(msg: ChatMensaje): boolean {
  const ref = refCentroChat(msg);
  if (!ref) return false;
  return msg.centro_activo === false;
}

export function esMensajeEliminacion(msg: ChatMensaje): boolean {
  return msg.autor === AUTOR_SISTEMA && msg.mensaje.includes("eliminado");
}
