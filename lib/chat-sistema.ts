export const AUTOR_SISTEMA = "Informa Aragua";

export function mensajeInformaConUbicacion(msg: {
  autor: string;
  centro_id: string | null;
}): boolean {
  return msg.autor === AUTOR_SISTEMA && !!msg.centro_id;
}
