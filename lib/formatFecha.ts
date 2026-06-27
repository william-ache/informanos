const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const VENEZUELA_TZ = "America/Caracas";

/** MySQL DATETIME o ISO → Date interpretado en hora Venezuela */
export function parseFechaEntrada(value: string): Date {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed.replace(" ", "T")}-04:00`);
  }

  return new Date(trimmed);
}

function claveDiaVenezuela(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: VENEZUELA_TZ });
}

function formatHoraVenezuela(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENEZUELA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hora = parts.find((p) => p.type === "hour")?.value ?? "12";
  const minuto = parts.find((p) => p.type === "minute")?.value ?? "00";
  const periodo =
    parts.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() ?? "AM";

  return `${hora.padStart(2, "0")}:${minuto} ${periodo}`;
}

function diaMesVenezuela(date: Date): { dia: number; mes: string } {
  const dia = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: VENEZUELA_TZ,
      day: "numeric",
    }).format(date),
  );
  const mesIndex =
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: VENEZUELA_TZ,
        month: "numeric",
      }).format(date),
    ) - 1;

  return { dia, mes: MESES[mesIndex] ?? "???" };
}

/** Ej: "Hoy a las 02:30 PM" · "26 de Jun, 09:15 PM" */
export function formatFechaHumana(value: string): string {
  const fecha = parseFechaEntrada(value);
  const hora = formatHoraVenezuela(fecha);

  if (claveDiaVenezuela(fecha) === claveDiaVenezuela(new Date())) {
    return `Hoy a las ${hora}`;
  }

  const { dia, mes } = diaMesVenezuela(fecha);
  return `${dia} de ${mes}, ${hora}`;
}
