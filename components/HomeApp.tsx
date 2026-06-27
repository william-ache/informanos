"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatFechaHumana } from "@/lib/formatFecha";
import {
  elementoDesdeInsumo,
  insumoValido,
} from "@/lib/insumos";
import {
  cumpleFiltroPoblacion,
  filtroPoblacionVacio,
  type FiltroPoblacion as FiltroPoblacionState,
} from "@/lib/poblacion";
import { swrDefaults } from "@/lib/swr-config";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useInputActivo } from "@/hooks/use-input-activo";
import { usePrivacidad } from "@/hooks/use-privacidad";
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

const CentroBuscador = dynamic(() => import("@/components/CentroBuscador"), {
  ssr: false,
});

const FiltroPoblacion = dynamic(() => import("@/components/FiltroPoblacion"), {
  ssr: false,
});

const PresenceStats = dynamic(() => import("@/components/PresenceStats"), {
  ssr: false,
});

const ReportarForm = dynamic(() => import("@/components/ReportarForm"), {
  ssr: false,
});

const CentrosList = dynamic(() => import("@/components/CentrosList"), {
  ssr: false,
});

const PoliticaPrivacidadModal = dynamic(
  () => import("@/components/PoliticaPrivacidadModal"),
  { ssr: false },
);

const ReportarErrorModal = dynamic(
  () => import("@/components/ReportarErrorModal"),
  { ssr: false },
);

const CENTROS_KEY = "/api/centros";

type Tab = "mapa" | "centros" | "chat" | "reportar" | "errores";

const tabs: { id: Tab; label: string; short: string }[] = [
  { id: "mapa", label: "Mapa", short: "M" },
  { id: "centros", label: "Centros", short: "C" },
  { id: "chat", label: "Chat", short: "H" },
  { id: "reportar", label: "Reportar", short: "!" },
  { id: "errores", label: "Errores", short: "E" },
];

const emptyNecesidad = {
  centro_id: "",
  tipo_insumo: "",
  elemento_otro: "",
  cantidad_solicitada: "",
  urgencia: "media" as UrgenciaNivel,
};

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
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [filtroPoblacion, setFiltroPoblacion] = useState<FiltroPoblacionState>(
    filtroPoblacionVacio,
  );
  const pageVisible = usePageVisible();
  const inputActivo = useInputActivo();
  const { pendiente: privacidadPendiente } = usePrivacidad();

  const { data, error, isLoading } = useSWR<CentrosResponse>(
    CENTROS_KEY,
    fetcher,
    {
      ...swrDefaults,
      refreshInterval: pageVisible && !inputActivo ? 5000 : 0,
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

  useEffect(() => {
    if (tab === "errores") setErrorModalOpen(true);
  }, [tab]);

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
      list = list.filter((c) => cumpleFiltroPoblacion(c, filtroPoblacion));
    }

    return list;
  }, [centros, textoBusqueda, centroActivoId, filtroPoblacion]);

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
      const elemento = elementoDesdeInsumo(
        necesidadForm.tipo_insumo,
        necesidadForm.elemento_otro,
      );

      if (!insumoValido(necesidadForm.tipo_insumo, necesidadForm.elemento_otro)) {
        throw new Error("Selecciona un insumo o describe el tipo «Otro».");
      }

      const res = await fetch("/api/necesidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centro_id: necesidadForm.centro_id,
          elemento,
          cantidad_solicitada: necesidadForm.cantidad_solicitada,
          urgencia: necesidadForm.urgencia,
        }),
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

          <CentrosList
            centros={centros}
            centrosFiltrados={centrosFiltrados}
            centroActivoId={centroActivoId}
            onSeleccionarCentro={setCentroActivoId}
            onQueryChange={setTextoBusqueda}
            filtroPoblacion={filtroPoblacion}
            onFiltroPoblacionChange={setFiltroPoblacion}
            isLoading={isLoading}
            errorMsg={errorMsg}
            onReportarCentro={abrirReporteCentro}
          />
          <ReportarForm
            centros={centros}
            form={necesidadForm}
            onFormChange={setNecesidadForm}
            onSubmit={agregarNecesidad}
            guardando={guardandoNecesidad}
          />
          <div className="border-t border-slate-800 p-4">
            <button
              type="button"
              onClick={() => setErrorModalOpen(true)}
              className="w-full rounded-xl border border-amber-800/60 bg-amber-950/30 py-3 text-sm font-semibold text-amber-300 active:bg-amber-950/50"
            >
              Reportar error del sistema
            </button>
          </div>
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
          <FiltroPoblacion value={filtroPoblacion} onChange={setFiltroPoblacion} />
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
            centros={centrosFiltrados}
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
            <CentrosList
              compact
              centros={centros}
              centrosFiltrados={centrosFiltrados}
              centroActivoId={centroActivoId}
              onSeleccionarCentro={setCentroActivoId}
              onQueryChange={setTextoBusqueda}
              filtroPoblacion={filtroPoblacion}
              onFiltroPoblacionChange={setFiltroPoblacion}
              isLoading={isLoading}
              errorMsg={errorMsg}
              onReportarCentro={abrirReporteCentro}
            />
          </div>
        )}

        {showMobileChat && (
          <div className="absolute inset-0 z-10 h-full bg-slate-950">
            <StreamingChat fullHeight />
          </div>
        )}

        {!isDesktop && tab === "reportar" && (
          <div className="absolute inset-0 z-10 h-full bg-slate-900">
            <ReportarForm
              compact
              centros={centros}
              form={necesidadForm}
              onFormChange={setNecesidadForm}
              onSubmit={agregarNecesidad}
              guardando={guardandoNecesidad}
            />
          </div>
        )}

        {!isDesktop && tab === "errores" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
            <p className="text-lg font-bold text-amber-300">Reportar errores</p>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Fallos del sistema, datos incorrectos o información falsa para
              corregirla pronto.
            </p>
            <button
              type="button"
              onClick={() => setErrorModalOpen(true)}
              className="mt-6 w-full max-w-xs rounded-xl bg-amber-600 py-3.5 text-base font-bold text-white active:bg-amber-500"
            >
              Abrir formulario
            </button>
          </div>
        )}
      </main>

      <PoliticaPrivacidadModal open={privacidadPendiente} />
      <ReportarErrorModal
        open={errorModalOpen}
        onClose={() => {
          setErrorModalOpen(false);
          if (tab === "errores" && !isDesktop) setTab("mapa");
        }}
        centros={centros}
      />

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
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition active:scale-95 ${
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
