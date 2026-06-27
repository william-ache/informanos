"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  cumpleFiltroTipoLugar,
  donacionVigente,
  filtroTipoLugarInicial,
  type FiltroTipoLugar,
} from "@/lib/tipo-lugar";
import { swrDefaults } from "@/lib/swr-config";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useInputActivo } from "@/hooks/use-input-activo";
import { usePrivacidad } from "@/hooks/use-privacidad";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  marcarInstalacionDescartada,
  marcarInstalacionPendiente,
  consumirInstalacionPendiente,
} from "@/lib/pwa-install";
import { obtenerConsentimientoPrivacidad, PRIVACIDAD_EVENT } from "@/lib/privacidad";
import type { CentroAcopio, NuevoCentroAcopio, TipoLugar, UrgenciaNivel } from "@/types/database";

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

const FiltroTipoLugar = dynamic(() => import("@/components/FiltroTipoLugar"), {
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

const DonacionesTab = dynamic(() => import("@/components/DonacionesTab"), {
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

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  ssr: false,
});

const InstalarAppModal = dynamic(() => import("@/components/InstalarAppModal"), {
  ssr: false,
});

const CENTROS_KEY = "/api/centros";

type Tab = "mapa" | "centros" | "chat" | "reportar" | "donaciones";
type DesktopPanel = "centros" | "reportar" | "chat";

const desktopTabs: { id: DesktopPanel; label: string }[] = [
  { id: "centros", label: "Centros" },
  { id: "reportar", label: "Reportar" },
  { id: "chat", label: "Chat" },
];

const tabs: { id: Tab; label: string; short: string }[] = [
  { id: "mapa", label: "Mapa", short: "M" },
  { id: "centros", label: "Centros", short: "C" },
  { id: "chat", label: "Chat", short: "H" },
  { id: "reportar", label: "Reportar", short: "!" },
  { id: "donaciones", label: "Donaciones", short: "D" },
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
  const [desktopPanel, setDesktopPanel] = useState<DesktopPanel>("centros");
  const [centroActivoId, setCentroActivoId] = useState<string | null>(null);
  const [agregarMenuOpen, setAgregarMenuOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const secretTapRef = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });
  const [filtroPoblacion, setFiltroPoblacion] = useState<FiltroPoblacionState>(
    filtroPoblacionVacio,
  );
  const [filtroTipoLugar, setFiltroTipoLugar] =
    useState<FiltroTipoLugar>(filtroTipoLugarInicial);
  const [tipoLugarInicial, setTipoLugarInicial] = useState<TipoLugar | null>(
    null,
  );
  const [mapUiModal, setMapUiModal] = useState(false);
  const [hintNuevoLugar, setHintNuevoLugar] = useState<string | null>(null);
  const [instalarAppOpen, setInstalarAppOpen] = useState(false);
  const pageVisible = usePageVisible();
  const inputActivo = useInputActivo();
  const { pendiente: privacidadPendiente } = usePrivacidad();
  const pwaInstall = usePwaInstall();

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
    function intentarMostrarInstalar() {
      if (!pwaInstall.puedeOfrecer) return;
      if (!consumirInstalacionPendiente()) return;
      window.setTimeout(() => setInstalarAppOpen(true), 450);
    }

    function onPrivacidadCambiada() {
      if (obtenerConsentimientoPrivacidad() !== "accepted") return;
      marcarInstalacionPendiente();
      intentarMostrarInstalar();
    }

    window.addEventListener(PRIVACIDAD_EVENT, onPrivacidadCambiada);
    intentarMostrarInstalar();

    return () => window.removeEventListener(PRIVACIDAD_EVENT, onPrivacidadCambiada);
  }, [pwaInstall.puedeOfrecer]);

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
      list = list.filter((c) => cumpleFiltroTipoLugar(c, filtroTipoLugar));
    }

    return list;
  }, [centros, textoBusqueda, centroActivoId, filtroPoblacion, filtroTipoLugar]);

  const abrirReporteCentro = useCallback((centro: CentroAcopio) => {
    setCentroActivoId(centro.id);
    setNecesidadForm((prev) => ({ ...prev, centro_id: centro.id }));
    setHintNuevoLugar(null);
    setDesktopPanel("reportar");
    setTab("reportar");
  }, []);

  const irAReportarTrasCrear = useCallback((centro: CentroAcopio) => {
    if (centro.tipo_lugar !== "acopio" && centro.tipo_lugar !== "urgencia") {
      setAgregarMenuOpen(false);
      setHintNuevoLugar(null);
      return;
    }
    setAgregarMenuOpen(false);
    setCentroActivoId(null);
    setNecesidadForm({ ...emptyNecesidad, centro_id: centro.id });
    setHintNuevoLugar(centro.nombre);
    setDesktopPanel("reportar");
    setTab("reportar");
  }, []);

  const verCentroEnLista = useCallback((centro: CentroAcopio) => {
    setCentroActivoId(centro.id);
    setDesktopPanel("centros");
    setTab("centros");
  }, []);

  const irACentroEnMapa = useCallback(
    (centroId: string) => {
      setCentroActivoId(centroId);
      if (!isDesktop) setTab("mapa");
    },
    [isDesktop],
  );

  function onSecretAdminTap() {
    secretTapRef.current.count += 1;
    if (secretTapRef.current.timer) clearTimeout(secretTapRef.current.timer);
    if (secretTapRef.current.count >= 5) {
      secretTapRef.current.count = 0;
      setAdminOpen(true);
      return;
    }
    secretTapRef.current.timer = setTimeout(() => {
      secretTapRef.current.count = 0;
    }, 2500);
  }

  const refrescarDatosAdmin = useCallback(async () => {
    await mutate(CENTROS_KEY);
    await mutate("/api/chat");
  }, []);

  const donacionesActivas = useMemo(
    () =>
      centros.filter(
        (c) => c.tipo_lugar === "donacion" && donacionVigente(c),
      ).length,
    [centros],
  );

  const iniciarDonacion = useCallback(() => {
    setTipoLugarInicial("donacion");
    setTab("mapa");
  }, []);

  const urgentes = useMemo(
    () =>
      centros.filter((c) =>
        (c.necesidades ?? []).some((n) => n.urgencia === "alta"),
      ).length,
    [centros],
  );

  const onRegistrarCentro = useCallback(async (centro: NuevoCentroAcopio): Promise<CentroAcopio> => {
    setAccionError(null);

    const res = await fetch(CENTROS_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centro),
    });

    const body = (await res.json().catch(() => null)) as {
      centro?: CentroAcopio;
      error?: string;
    } | null;

    if (!res.ok || !body?.centro) {
      const msg = body?.error ?? "No se pudo registrar el centro.";
      setAccionError(msg);
      throw new Error(msg);
    }

    await mutate(
      CENTROS_KEY,
      (actual) => {
        const previos = actual?.centros ?? [];
        if (previos.some((c: CentroAcopio) => c.id === body.centro!.id)) return actual;
        return { centros: [...previos, body.centro!] };
      },
      { revalidate: true },
    );

    return body.centro;
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
      setHintNuevoLugar(null);
      await mutate(CENTROS_KEY);
      if (isDesktop) setDesktopPanel("centros");
      else setTab("centros");
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
  const flotantesOcultos =
    errorModalOpen ||
    adminOpen ||
    privacidadPendiente ||
    instalarAppOpen ||
    agregarMenuOpen ||
    mapUiModal;

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {isDesktop && (
        <aside className="flex min-h-0 w-[min(420px,36vw)] min-w-[340px] max-w-md flex-col border-r border-slate-800 bg-slate-900">
          <header className="shrink-0 border-b border-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  role="presentation"
                  onClick={onSecretAdminTap}
                  className="cursor-default text-xs font-semibold uppercase tracking-widest text-red-400 select-none"
                >
                  Emergencia · Estado Aragua
                </p>
                <h1 className="mt-1 text-xl font-bold">Centros de Acopio</h1>
              </div>
              <button
                type="button"
                onClick={() => setErrorModalOpen(true)}
                className="shrink-0 rounded-lg border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-950/60"
              >
                Reportar
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>{centros.length} activos</span>
              {urgentes > 0 && (
                <span className="font-semibold text-red-400">{urgentes} urgentes</span>
              )}
              {syncLabel && <span className="text-emerald-400">Sync {syncLabel}</span>}
              <PresenceStats />
            </div>
          </header>

          <nav className="flex shrink-0 border-b border-slate-800">
            {desktopTabs.map((item) => {
              const active = desktopPanel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDesktopPanel(item.id)}
                  className={`flex-1 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-b-2 border-red-500 text-red-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {desktopPanel === "centros" && (
              <CentrosList
                fillHeight
                centros={centros}
                centrosFiltrados={centrosFiltrados}
                centroActivoId={centroActivoId}
                onSeleccionarCentro={setCentroActivoId}
                onQueryChange={setTextoBusqueda}
                filtroPoblacion={filtroPoblacion}
                onFiltroPoblacionChange={setFiltroPoblacion}
                filtroTipoLugar={filtroTipoLugar}
                onFiltroTipoLugarChange={setFiltroTipoLugar}
                isLoading={isLoading}
                errorMsg={errorMsg}
                onReportarCentro={abrirReporteCentro}
              />
            )}

            {desktopPanel === "reportar" && (
              <ReportarForm
                compact
                centros={centros}
                form={necesidadForm}
                onFormChange={setNecesidadForm}
                onSubmit={agregarNecesidad}
                guardando={guardandoNecesidad}
                mensajeInicial={
                  hintNuevoLugar
                    ? `Lugar «${hintNuevoLugar}» creado. Indica qué necesita.`
                    : undefined
                }
              />
            )}

            {desktopPanel === "chat" && (
              <StreamingChat fullHeight hideHeader onIrACentro={irACentroEnMapa} />
            )}
          </div>
        </aside>
      )}

      {!isDesktop && (
        <header className="shrink-0 border-b border-slate-800 bg-slate-900 px-4 pb-3 pt-safe">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                role="presentation"
                onClick={onSecretAdminTap}
                className="cursor-default text-[10px] font-bold uppercase tracking-widest text-red-400 select-none"
              >
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
          </div>
          {tab === "mapa" && (
            <div className="mt-2.5">
              <FiltroTipoLugar
                compact
                value={filtroTipoLugar}
                onChange={setFiltroTipoLugar}
              />
            </div>
          )}
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
            onLugarCreado={irAReportarTrasCrear}
            tipoLugarInicial={tipoLugarInicial}
            onTipoLugarInicialConsumido={() => setTipoLugarInicial(null)}
            hideAgregarButton={!isDesktop}
            agregarEnCentro={!isDesktop && tab === "mapa"}
            agregarMenuOpen={agregarMenuOpen}
            onAgregarMenuChange={setAgregarMenuOpen}
            onUiModalChange={setMapUiModal}
            className="h-full"
          />
          {mapActive && (
            <LiveChatOverlay showNavOffset={!isDesktop} onIrACentro={irACentroEnMapa} />
          )}
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
              filtroTipoLugar={filtroTipoLugar}
              onFiltroTipoLugarChange={setFiltroTipoLugar}
              isLoading={isLoading}
              errorMsg={errorMsg}
              onReportarCentro={abrirReporteCentro}
            />
          </div>
        )}

        {showMobileChat && (
          <div className="absolute inset-0 z-10 h-full bg-slate-950">
            <StreamingChat fullHeight onIrACentro={irACentroEnMapa} />
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
              mensajeInicial={
                hintNuevoLugar
                  ? `Lugar «${hintNuevoLugar}» creado. Indica qué necesita.`
                  : undefined
              }
            />
          </div>
        )}

        {!isDesktop && tab === "donaciones" && (
          <div className="absolute inset-0 z-10 flex flex-col bg-slate-900">
            <DonacionesTab
              centros={centros}
              onAgregarDonacion={iniciarDonacion}
              onVerEnMapa={(centroId) => {
                setCentroActivoId(centroId);
                setTab("mapa");
              }}
            />
          </div>
        )}
      </main>

      {!isDesktop && !flotantesOcultos && (
        <button
          type="button"
          onClick={() => setErrorModalOpen(true)}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-amber-700/60 bg-amber-950/90 text-lg text-amber-200 shadow-lg backdrop-blur active:scale-95"
          aria-label="Reportar error"
        >
          ⚠
        </button>
      )}

      <PoliticaPrivacidadModal open={privacidadPendiente} />
      <InstalarAppModal
        open={instalarAppOpen && !privacidadPendiente}
        esIos={pwaInstall.esIos}
        onInstalar={pwaInstall.instalar}
        onClose={() => {
          setInstalarAppOpen(false);
          marcarInstalacionDescartada();
        }}
      />
      <ReportarErrorModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        centros={centros}
      />
      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        centros={centros}
        onDataChange={refrescarDatosAdmin}
      />

      {!isDesktop && (
        <nav className="relative z-30 flex shrink-0 border-t border-slate-800 bg-slate-950 pb-safe">
          {tabs.map((item) => {
            const active = tab === item.id;
            const badge =
              item.id === "centros"
                ? urgentes
                : item.id === "donaciones"
                  ? donacionesActivas
                  : 0;

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
                  <span
                    className={`absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                      item.id === "donaciones" ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  >
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
