import L from "leaflet";
import type { TipoLugar } from "@/types/database";
import { colorTipoLugar } from "@/lib/tipo-lugar";

const iconCache = new Map<TipoLugar, L.DivIcon>();

export function configureLeafletIcons(): void {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
    ._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconUrl: "/leaflet/marker-icon.png",
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

export function iconoCentro(tipo: TipoLugar): L.DivIcon {
  const cached = iconCache.get(tipo);
  if (cached) return cached;

  const color = colorTipoLugar(tipo);
  const icon = L.divIcon({
    className: "centro-marker-wrap",
    html: `<div class="centro-marker-pin" style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });

  iconCache.set(tipo, icon);
  return icon;
}
