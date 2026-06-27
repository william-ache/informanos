/** Polígono simplificado del Estado Aragua [lat, lng] */
export const ARAGUA_POLYGON: [number, number][] = [
  [10.518, -67.745],
  [10.502, -67.485],
  [10.475, -67.285],
  [10.415, -67.035],
  [10.325, -66.815],
  [10.185, -66.775],
  [10.045, -66.825],
  [9.915, -67.055],
  [9.885, -67.355],
  [9.905, -67.565],
  [9.975, -67.755],
  [10.125, -67.855],
  [10.285, -67.885],
  [10.425, -67.815],
  [10.518, -67.745],
];

export function puntoEnAragua(lat: number, lng: number): boolean {
  let inside = false;

  for (let i = 0, j = ARAGUA_POLYGON.length - 1; i < ARAGUA_POLYGON.length; j = i++) {
    const [latI, lngI] = ARAGUA_POLYGON[i];
    const [latJ, lngJ] = ARAGUA_POLYGON[j];

    const cruza =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;

    if (cruza) inside = !inside;
  }

  return inside;
}

export const MENSAJE_FUERA_ARAGUA =
  "Por ahora solo cubrimos el Estado Aragua. Ubica el centro dentro de la zona resaltada.";
