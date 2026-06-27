"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatFechaHumana } from "@/lib/formatFecha";
import { swrDefaults } from "@/lib/swr-config";
import { usePageVisible } from "@/hooks/use-page-visible";
import type { CentroAcopio, NuevoCentroAcopio, UrgenciaNivel } from "@/types/database";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => null,
});

const LiveChatOverlay = dynamic(() => import("@/components/LiveChatOverlay"), {
  ssr: false,
});

const StreamingChat = dynamic(() => import("@/components/StreamingChat"), {
  ssr: false,
  loading: () => null,
});

const NecesidadVotos = dynamic(() => import("@/components/NecesidadVotos"), {
  ssr: false,
});

const CentroBuscador = dynamic(() => import("@/components/CentroBuscador"), {
  ssr: false,
});

const SearchableSelect = dynamic(() => import("@/components/SearchableSelect"), {
  ssr: false,
});

const PresenceStats = dynamic(() => import("@/components/PresenceStats"), {
  ssr: false,
});

const CENTROS_KEY = "/api/centros";

type Tab = "mapa" | "centros" | "chat" | "reportar";

const tabs: { id: Tab; label: string; short: string }[] = [
  { id: "mapa", label: "Mapa", short: "M" },
  { id: "centros", label: "Centros", short: "C" },
  { id: "chat", label: "Chat", short: "H" },
  { id: "reportar", label: "Reportar", short: "!" },
];

const emptyNecesidad = {
  centro_id: "",
  elemento: "",
  cantidad_solicitada: "",
  urgencia: "media" as UrgenciaNivel,
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none focus:border-red-500";

interface CentrosResponse {
  centros: CentroAcopio[];
}

export default function HomeApp() {
  const [tab, setTab] = useState<Tab>("mapa");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [necesidadForm, setNecesidadForm] = useState(emptyNecesidad);
  const [guardandoNecesidad, setGuardandoNecesidad] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [centroActivoId, setCentroActivoId] = useState<string | null>(null);
  const [agregarMenuOpen, setAgregarMenuOpen] = useState(false);
  const pageVisible = usePageVisible();

  const { data, error, isLoading } = useSWR<CentrosResponse>(
    CENTROS_KEY,
    fetcher,
    {
      ...swrDefaults,
      refreshInterval: pageVisible ? 5000 : 0,
    },
  );

  const centros = data?.centros ?? [];

  useEffect(() => {
    if (data) setUltimoSync(new Date().toISOString());
  }, [data]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const centrosFiltrados = useMemo(() => {
    let list = centros;

    if (centroActivoId) {
      list = list.filter((c) => c.id === centroActivoId);
    } else {
      const q = textoBusqueda.trim().toLowerCase();
      if (q) {
        list = list.filter(
          (c) =>
            c.municipio.toLowerCase().includes(q) ||
            c.nombre.toLowerCase().includes(q) ||
            (c.direccion?.toLowerCase().includes(q) ?? false),
        );
      }
    }

    return list;
  }, [centros, textoBusqueda, centroActivoId]);

  const abrirReporteCentro = useCallback((centro: CentroAcopio) => {
    setCentroActivoId(centro.id);
    setNecesidadForm((prev) => ({ ...prev, centro_id: centro.id }));
    setTab("reportar");
  }, []);

  const verCentroEnLista = useCallback((centro: CentroAcopio) => {
    setCentroActivoId(centro.id);
    setTab("centros");
  }, []);

  const urgentes = useMemo(
    () =>
      centros.filter((c) =>
        (c.necesidades ?? []).some((n) => n.urgencia === "alta"),
      ).length,
    [centros],
  );

  const onRegistrarCentro = useCallback(async (centro: NuevoCentroAcopio) => {
    setAccionError(null);

    const res = await fetch(CENTROS_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centro),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      const msg = body?.error ?? "No se pudo registrar el centro.";
      setAccionError(msg);
      throw new Error(msg);
    }

    await mutate(CENTROS_KEY);
  }, []);

  async function agregarNecesidad(event: React.FormEvent) {
    event.preventDefault();
    setGuardandoNecesidad(true);
    setAccionError(null);

    try {
      const res = await fetch("/api/necesidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(necesidadForm),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo registrar la necesidad.");
      }

      setNecesidadForm(emptyNecesidad);
      await mutate(CENTROS_KEY);
      setTab("centros");
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setGuardandoNecesidad(false);
    }
  }

  const syncLabel = ultimoSync ? formatFechaHumana(ultimoSync) : null;
  const errorMsg =
    accionError ?? (error instanceof Error ? error.message : error ? "Error al cargar" : null);

  const showMobileChat = !isDesktop && tab === "chat";
  const mapActive = isDesktop || tab === "mapa";

  function CentrosList({ compact = false }: { compact?: boolean }) {
    return (
      <>
        <div className={compact ? "px-4 pt-3" : "border-b border-slate-800 p-4"}>
          <CentroBuscador
            centros={centros}
            activoId={centroActivoId}
            onSeleccionar={setCentroActivoId}
            onQueryChange={setTextoBusqueda}
            placeholder="Buscar por nombre o municipio…"
            className={compact ? "" : "mt-0"}
          />
        </div>

        <div className={`overflow-y-auto ${compact ? "flex-1 px-4 py-3" : "min-h-0 flex-1 p-4"}`}>
          {isLoading && <p className="text-sm text-slate-400">Cargando centros…</p>}
          {errorMsg && (
            <p className="mb-3 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {errorMsg}
            </p>
          )}
          {!isLoading && centrosFiltrados.length === 0 && (
            <p className="text-sm text-slate-400">No hay centros en este filtro.</p>
          )}

          <ul className="space-y-3 pb-4">
            {centrosFiltrados.map((centro) => {
              const urgenciaAlta = (centro.necesidades ?? []).some(
                (n) => n.urgencia === "alta",
              );

              return (
                <li
                  key={centro.id}
                  onClick={() => setCentroActivoId(centro.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 active:bg-slate-900 ${
                    centroActivoId === centro.id
                      ? "border-red-500 bg-red-950/20"
                      : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {urgenciaAlta && (
                      <span className="mt-1.5 h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{centro.nombre}</p>
                      <p className="text-sm text-slate-400">{centro.municipio}</p>
                      {centro.contacto && (
                        <a
                          href={`tel:${centro.contacto.replace(/\s/g, "")}`}
                          className="mt-1 inline-block text-sm text-blue-400 underline"
                        >
                          {centro.contacto}
                        </a>
                      )}
                      {(centro.necesidades ?? []).length > 0 && (
                        <ul
                          className="mt-2 space-y-2 border-t border-slate-800 pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(centro.necesidades ?? []).map((nec) => (
                            <NecesidadVotos
                              key={nec.id}
                              centro={centro}
                              necesidad={nec}
                            />
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirReporteCentro(centro);
                        }}
                        className="mt-3 w-full rounded-lg border border-red-800/60 py-2 text-xs font-semibold text-red-300 active:bg-red-950/40"
                      >
                        + Reportar necesidad
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </>
    );
  }

  function ReportarForm({ compact = false }: { compact?: boolean }) {
    return (
      <form
        onSubmit={agregarNecesidad}
        className={`overflow-y-auto bg-slate-900 ${compact ? "flex h-full flex-col p-4" : "border-t border-slate-800 p-4"}`}
      >
        <p className="mb-1 text-lg font-bold text-red-300">Registrar necesidad</p>
        <p className="mb-4 text-sm text-slate-400">
          Indica qué insumos faltan en un centro de acopio.
        </p>

        <SearchableSelect
          required
          value={necesidadForm.centro_id}
          onChange={(centro_id) =>
            setNecesidadForm((prev) => ({ ...prev, centro_id }))
          }
          placeholder="Buscar centro…"
          className="mb-3"
          options={centros.map((c) => ({
            value: c.id,
            label: c.nombre,
            sublabel: c.municipio,
          }))}
        />

        <input
          required
          type="text"
          placeholder="Insumo (ej. Agua, Medicamentos)"
          value={necesidadForm.elemento}
          onChange={(e) =>
            setNecesidadForm((prev) => ({ ...prev, elemento: e.target.value }))
          }
          className={`${inputClass} mb-3`}
        />

        <input
          required
          type="text"
          placeholder="Cantidad solicitada"
          value={necesidadForm.cantidad_solicitada}
          onChange={(e) =>
            setNecesidadForm((prev) => ({
              ...prev,
              cantidad_solicitada: e.target.value,
            }))
          }
          className={`${inputClass} mb-3`}
        />

        <SearchableSelect
          value={necesidadForm.urgencia}
          onChange={(urgencia) =>
            setNecesidadForm((prev) => ({
              ...prev,
              urgencia: urgencia as UrgenciaNivel,
            }))
          }
          placeholder="Buscar urgencia…"
          className="mb-4"
          maxResults={3}
          options={[
            { value: "alta", label: "Alta", sublabel: "Prioridad máxima" },
            { value: "media", label: "Media", sublabel: "Prioridad moderada" },
            { value: "baja", label: "Baja", sublabel: "Prioridad baja" },
          ]}
        />

        <button
          type="submit"
          disabled={guardandoNecesidad || centros.length === 0}
          className="mt-auto w-full rounded-xl bg-red-600 py-4 text-base font-bold text-white active:bg-red-500 disabled:opacity-50"
        >
          {guardandoNecesidad ? "Guardando…" : "Enviar reporte"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {isDesktop && (
        <aside className="flex w-full max-w-md flex-col border-r border-slate-800 bg-slate-900">
          <header className="border-b border-slate-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
              Emergencia · Estado Aragua
            </p>
            <h1 className="mt-1 text-xl font-bold">Centros de Acopio</h1>
            <p className="mt-1 text-sm text-slate-400">
              {centros.length} activos · {urgentes} urgentes
              {syncLabel && (
                <span className="block text-emerald-400">Sync: {syncLabel}</span>
              )}
            </p>
            <PresenceStats />
          </header>

          <CentrosList />
          <ReportarForm />
        </aside>
      )}

      {!isDesktop && (
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 pt-safe">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Emergencia · Aragua
            </p>
            <h1 className="text-base font-bold leading-tight">
              {tabs.find((t) => t.id === tab)?.label ?? "Informa"}
            </h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>{centros.length} centros</p>
            {urgentes > 0 && <p className="font-bold text-red-400">{urgentes} urgentes</p>}
            <div className="mt-1 flex justify-end">
              <PresenceStats />
            </div>
          </div>
        </header>
      )}

      {!isDesktop && tab === "mapa" && (
        <div className="shrink-0 space-y-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
          <CentroBuscador
            centros={centros}
            activoId={centroActivoId}
            onSeleccionar={setCentroActivoId}
            placeholder="Buscar lugar…"
          />
          <button
            type="button"
            onClick={() => setAgregarMenuOpen(true)}
            className="w-full rounded-xl bg-blue-700 py-2.5 text-sm font-bold text-white active:bg-blue-600"
          >
            + Agregar lugar de ayuda
          </button>
        </div>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            mapActive
              ? "z-0"
              : "pointer-events-none invisible z-0 lg:pointer-events-auto lg:visible"
          }`}
        >
          <Map
            active={mapActive}
            centros={centros}
            centroActivoId={centroActivoId}
            onReportarCentro={abrirReporteCentro}
            onVerCentroLista={verCentroEnLista}
            onRegistrarCentro={onRegistrarCentro}
            hideAgregarButton={!isDesktop}
            agregarMenuOpen={agregarMenuOpen}
            onAgregarMenuChange={setAgregarMenuOpen}
            className="h-full"
          />
          {mapActive && <LiveChatOverlay showNavOffset={!isDesktop} />}
        </div>

        {!isDesktop && tab === "centros" && (
          <div className="absolute inset-0 z-10 flex flex-col bg-slate-900">
            <CentrosList compact />
          </div>
        )}

        {showMobileChat && (
          <div className="absolute inset-0 z-10 h-full bg-slate-950">
            <StreamingChat fullHeight />
          </div>
        )}

        {!isDesktop && tab === "reportar" && (
          <div className="absolute inset-0 z-10 h-full bg-slate-900">
            <ReportarForm compact />
          </div>
        )}
      </main>

      {!isDesktop && (
        <nav className="relative z-30 flex shrink-0 border-t border-slate-800 bg-slate-950 pb-safe">
          {tabs.map((item) => {
            const active = tab === item.id;
            const badge = item.id === "centros" ? urgentes : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition active:scale-95 ${
                  active ? "text-red-400" : "text-slate-500"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.short}
                </span>
                {item.label}
                {badge > 0 && (
                  <span className="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
