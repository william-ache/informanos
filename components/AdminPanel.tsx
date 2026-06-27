"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalPortal from "@/components/ModalPortal";
import {
  adminFetch,
  guardarAdminToken,
  limpiarAdminToken,
  obtenerAdminToken,
} from "@/lib/admin-client";
import { formatFechaHumana } from "@/lib/formatFecha";
import type { CentroAcopio, ChatMensaje, Necesidad, ReporteError, UrgenciaNivel } from "@/types/database";

type AdminTab = "lugares" | "necesidades" | "chat" | "reportes";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  centros: CentroAcopio[];
  onDataChange: () => Promise<void>;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "lugares", label: "Lugares" },
  { id: "necesidades", label: "Necesidades" },
  { id: "chat", label: "Chat" },
  { id: "reportes", label: "Reportes" },
];

export default function AdminPanel({
  open,
  onClose,
  centros,
  onDataChange,
}: AdminPanelProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("lugares");
  const [busqueda, setBusqueda] = useState("");
  const [editandoCentroId, setEditandoCentroId] = useState<string | null>(null);
  const [editandoNecId, setEditandoNecId] = useState<string | null>(null);
  const [editandoChatId, setEditandoChatId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [reportes, setReportes] = useState<ReporteError[]>([]);
  const [cargando, setCargando] = useState(false);

  const [formCentro, setFormCentro] = useState({
    nombre: "",
    municipio: "",
    direccion: "",
    contacto: "",
    latitud: "",
    longitud: "",
    aprox_ninos: "",
    aprox_personas: "",
    aprox_ancianos: "",
    aprox_animales: "",
  });

  const [formNec, setFormNec] = useState({
    elemento: "",
    cantidad_solicitada: "",
    urgencia: "media" as UrgenciaNivel,
    estado: "disponible" as "disponible" | "agotado",
  });

  const [formChat, setFormChat] = useState("");

  const verificarSesion = useCallback(async () => {
    const token = obtenerAdminToken();
    if (!token) {
      setAutenticado(false);
      setVerificando(false);
      return;
    }

    const res = await adminFetch("/api/admin/reportes");
    if (res.ok) {
      setAutenticado(true);
    } else {
      limpiarAdminToken();
      setAutenticado(false);
    }
    setVerificando(false);
  }, []);

  const cargarChat = useCallback(async () => {
    const res = await fetch("/api/chat");
    if (!res.ok) return;
    const body = (await res.json()) as { mensajes?: ChatMensaje[] };
    setMensajes(body.mensajes ?? []);
  }, []);

  const cargarReportes = useCallback(async () => {
    const res = await adminFetch("/api/admin/reportes");
    if (!res.ok) return;
    const body = (await res.json()) as { reportes?: ReporteError[] };
    setReportes(body.reportes ?? []);
  }, []);

  useEffect(() => {
    if (!open) return;
    setVerificando(true);
    setError(null);
    void verificarSesion();
  }, [open, verificarSesion]);

  useEffect(() => {
    if (!open || !autenticado) return;
    if (tab === "chat") void cargarChat();
    if (tab === "reportes") void cargarReportes();
  }, [open, autenticado, tab, cargarChat, cargarReportes]);

  const lugaresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return centros;
    return centros.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.municipio.toLowerCase().includes(q) ||
        (c.direccion?.toLowerCase().includes(q) ?? false),
    );
  }, [centros, busqueda]);

  const todasNecesidades = useMemo(() => {
    const lista: (Necesidad & { centroNombre: string })[] = [];
    for (const centro of centros) {
      for (const nec of centro.necesidades ?? []) {
        lista.push({ ...nec, centroNombre: centro.nombre });
      }
    }
    return lista;
  }, [centros]);

  async function iniciarSesion(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: clave.trim() }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Clave incorrecta.");
      }

      guardarAdminToken(clave.trim());
      setAutenticado(true);
      setClave("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al entrar.");
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    limpiarAdminToken();
    setAutenticado(false);
    setEditandoCentroId(null);
    setEditandoNecId(null);
    setEditandoChatId(null);
  }

  function cerrarPanel() {
    setError(null);
    setBusqueda("");
    setEditandoCentroId(null);
    onClose();
  }

  function abrirEditarCentro(centro: CentroAcopio) {
    setEditandoCentroId(centro.id);
    setFormCentro({
      nombre: centro.nombre,
      municipio: centro.municipio,
      direccion: centro.direccion ?? "",
      contacto: centro.contacto ?? "",
      latitud: String(centro.latitud),
      longitud: String(centro.longitud),
      aprox_ninos: centro.aprox_ninos == null ? "" : String(centro.aprox_ninos),
      aprox_personas: centro.aprox_personas == null ? "" : String(centro.aprox_personas),
      aprox_ancianos: centro.aprox_ancianos == null ? "" : String(centro.aprox_ancianos),
      aprox_animales: centro.aprox_animales == null ? "" : String(centro.aprox_animales),
    });
  }

  async function guardarCentro(id: string) {
    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/centros/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre: formCentro.nombre,
          municipio: formCentro.municipio,
          direccion: formCentro.direccion,
          contacto: formCentro.contacto,
          latitud: Number(formCentro.latitud),
          longitud: Number(formCentro.longitud),
          aprox_ninos: formCentro.aprox_ninos || null,
          aprox_personas: formCentro.aprox_personas || null,
          aprox_ancianos: formCentro.aprox_ancianos || null,
          aprox_animales: formCentro.aprox_animales || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar.");
      }
      setEditandoCentroId(null);
      await onDataChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setCargando(false);
    }
  }

  async function borrarCentro(centro: CentroAcopio) {
    if (!window.confirm(`¿Borrar «${centro.nombre}» y sus necesidades?`)) return;

    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/centros/${centro.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo borrar.");
      }
      setEditandoCentroId(null);
      await onDataChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setCargando(false);
    }
  }

  function abrirEditarNec(nec: Necesidad) {
    setEditandoNecId(nec.id);
    setFormNec({
      elemento: nec.elemento,
      cantidad_solicitada: nec.cantidad_solicitada,
      urgencia: nec.urgencia,
      estado: nec.estado,
    });
  }

  async function guardarNec(id: string) {
    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/necesidades/${id}`, {
        method: "PATCH",
        body: JSON.stringify(formNec),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar.");
      }
      setEditandoNecId(null);
      await onDataChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setCargando(false);
    }
  }

  async function borrarNec(nec: Necesidad & { centroNombre?: string }) {
    if (!window.confirm(`¿Borrar necesidad «${nec.elemento}»?`)) return;

    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/necesidades/${nec.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo borrar.");
      }
      setEditandoNecId(null);
      await onDataChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setCargando(false);
    }
  }

  function abrirEditarChat(msg: ChatMensaje) {
    setEditandoChatId(msg.id);
    setFormChat(msg.mensaje);
  }

  async function guardarChat(id: string) {
    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/chat/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ mensaje: formChat }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar.");
      }
      setEditandoChatId(null);
      await cargarChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setCargando(false);
    }
  }

  async function borrarChat(msg: ChatMensaje) {
    if (!window.confirm("¿Borrar este mensaje del chat?")) return;

    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/chat/${msg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo borrar.");
      }
      setEditandoChatId(null);
      await cargarChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setCargando(false);
    }
  }

  async function borrarReporte(reporte: ReporteError) {
    if (!window.confirm("¿Borrar este reporte?")) return;

    setCargando(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/reportes/${reporte.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo borrar.");
      }
      await cargarReportes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setCargando(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[10000] flex items-end bg-black/70 lg:items-center lg:justify-center lg:p-4"
        onClick={cerrarPanel}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-slate-900 shadow-2xl lg:max-h-[85vh] lg:max-w-2xl lg:rounded-2xl"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                Panel admin
              </p>
              <h2 className="text-lg font-bold text-white">Moderación</h2>
            </div>
            <div className="flex gap-2">
              {autenticado && (
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
                >
                  Salir
                </button>
              )}
              <button
                type="button"
                onClick={cerrarPanel}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </header>

          {verificando ? (
            <p className="p-6 text-sm text-slate-400">Verificando…</p>
          ) : !autenticado ? (
            <form onSubmit={iniciarSesion} className="space-y-4 p-5">
              <p className="text-sm text-slate-400">
                Clave de administrador (solo tú la conoces).
              </p>
              <input
                type="password"
                autoComplete="off"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Clave admin"
                className={inputClass.replace("mt-1", "")}
              />
              {error && (
                <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={cargando || !clave.trim()}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {cargando ? "Entrando…" : "Entrar"}
              </button>
            </form>
          ) : (
            <>
              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 px-3 py-2">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      tab === item.id
                        ? "bg-violet-600 text-white"
                        : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {error && (
                  <p className="mb-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                {tab === "lugares" && (
                  <div className="space-y-3">
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar lugar…"
                      className={inputClass.replace("mt-1", "")}
                    />
                    {lugaresFiltrados.map((centro) => (
                      <div
                        key={centro.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        {editandoCentroId === centro.id ? (
                          <div className="space-y-2">
                            <label className="block text-xs text-slate-400">
                              Nombre
                              <input
                                value={formCentro.nombre}
                                onChange={(e) =>
                                  setFormCentro((p) => ({ ...p, nombre: e.target.value }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <label className="block text-xs text-slate-400">
                              Municipio
                              <input
                                value={formCentro.municipio}
                                onChange={(e) =>
                                  setFormCentro((p) => ({ ...p, municipio: e.target.value }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <label className="block text-xs text-slate-400">
                              Dirección
                              <input
                                value={formCentro.direccion}
                                onChange={(e) =>
                                  setFormCentro((p) => ({ ...p, direccion: e.target.value }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <label className="block text-xs text-slate-400">
                              Contacto
                              <input
                                value={formCentro.contacto}
                                onChange={(e) =>
                                  setFormCentro((p) => ({ ...p, contacto: e.target.value }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block text-xs text-slate-400">
                                Lat
                                <input
                                  value={formCentro.latitud}
                                  onChange={(e) =>
                                    setFormCentro((p) => ({ ...p, latitud: e.target.value }))
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block text-xs text-slate-400">
                                Lng
                                <input
                                  value={formCentro.longitud}
                                  onChange={(e) =>
                                    setFormCentro((p) => ({ ...p, longitud: e.target.value }))
                                  }
                                  className={inputClass}
                                />
                              </label>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={cargando}
                                onClick={() => void guardarCentro(centro.id)}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditandoCentroId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">{centro.nombre}</p>
                            <p className="text-sm text-slate-400">{centro.municipio}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {(centro.necesidades ?? []).length} necesidades ·{" "}
                              {centro.latitud.toFixed(5)}, {centro.longitud.toFixed(5)}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => abrirEditarCentro(centro)}
                                className="rounded-lg border border-violet-800/60 px-3 py-1.5 text-xs text-violet-300"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void borrarCentro(centro)}
                                className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-300"
                              >
                                Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === "necesidades" && (
                  <div className="space-y-3">
                    {todasNecesidades.length === 0 && (
                      <p className="text-sm text-slate-500">Sin necesidades.</p>
                    )}
                    {todasNecesidades.map((nec) => (
                      <div
                        key={nec.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        {editandoNecId === nec.id ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">{nec.centroNombre}</p>
                            <input
                              value={formNec.elemento}
                              onChange={(e) =>
                                setFormNec((p) => ({ ...p, elemento: e.target.value }))
                              }
                              className={inputClass.replace("mt-1", "")}
                            />
                            <input
                              value={formNec.cantidad_solicitada}
                              onChange={(e) =>
                                setFormNec((p) => ({
                                  ...p,
                                  cantidad_solicitada: e.target.value,
                                }))
                              }
                              className={inputClass.replace("mt-1", "")}
                            />
                            <select
                              value={formNec.urgencia}
                              onChange={(e) =>
                                setFormNec((p) => ({
                                  ...p,
                                  urgencia: e.target.value as UrgenciaNivel,
                                }))
                              }
                              className={inputClass.replace("mt-1", "")}
                            >
                              <option value="alta">Alta</option>
                              <option value="media">Media</option>
                              <option value="baja">Baja</option>
                            </select>
                            <select
                              value={formNec.estado}
                              onChange={(e) =>
                                setFormNec((p) => ({
                                  ...p,
                                  estado: e.target.value as "disponible" | "agotado",
                                }))
                              }
                              className={inputClass.replace("mt-1", "")}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="agotado">Agotado</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={cargando}
                                onClick={() => void guardarNec(nec.id)}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditandoNecId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">{nec.elemento}</p>
                            <p className="text-sm text-slate-400">
                              {nec.centroNombre} · {nec.cantidad_solicitada} · {nec.urgencia}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => abrirEditarNec(nec)}
                                className="rounded-lg border border-violet-800/60 px-3 py-1.5 text-xs text-violet-300"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void borrarNec(nec)}
                                className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-300"
                              >
                                Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === "chat" && (
                  <div className="space-y-3">
                    {mensajes.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex justify-between gap-2 text-xs text-slate-500">
                          <span>{msg.autor}</span>
                          <time>{formatFechaHumana(msg.creado_en)}</time>
                        </div>
                        {editandoChatId === msg.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              rows={3}
                              value={formChat}
                              onChange={(e) => setFormChat(e.target.value)}
                              className={inputClass.replace("mt-1", "")}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={cargando}
                                onClick={() => void guardarChat(msg.id)}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditandoChatId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-2 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 text-sm text-slate-300">{msg.mensaje}</p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => abrirEditarChat(msg)}
                                className="rounded-lg border border-violet-800/60 px-3 py-1.5 text-xs text-violet-300"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void borrarChat(msg)}
                                className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-300"
                              >
                                Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === "reportes" && (
                  <div className="space-y-3">
                    {reportes.length === 0 && (
                      <p className="text-sm text-slate-500">Sin reportes.</p>
                    )}
                    {reportes.map((reporte) => (
                      <div
                        key={reporte.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <p className="text-xs font-semibold uppercase text-amber-400">
                          {reporte.tipo}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">{reporte.descripcion}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFechaHumana(reporte.creado_en)}
                          {reporte.contacto ? ` · ${reporte.contacto}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => void borrarReporte(reporte)}
                          className="mt-2 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-300"
                        >
                          Borrar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
