import { chamarGoogleJson } from "./cliente";

const URL_EVENTOS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const QUANTIDADE_PADRAO = 10;

interface EventoGoogle {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  attendees?: unknown[];
}

// Só o necessário para a tela: sem e-mails de participantes (minimização de dados).
export interface Reuniao {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  linkMeet: string | null;
  participantes: number;
}

export function paraReuniao(evento: EventoGoogle): Reuniao {
  const diaInteiro = !evento.start?.dateTime;
  return {
    id: evento.id,
    titulo: evento.summary?.trim() || "(sem título)",
    inicio: evento.start?.dateTime ?? evento.start?.date ?? "",
    fim: evento.end?.dateTime ?? evento.end?.date ?? "",
    diaInteiro,
    linkMeet: evento.hangoutLink ?? null,
    participantes: evento.attendees?.length ?? 0,
  };
}

export async function listarProximasReunioes(accessToken: string, agora = new Date()): Promise<Reuniao[]> {
  const parametros = new URLSearchParams({
    timeMin: agora.toISOString(),
    maxResults: String(QUANTIDADE_PADRAO),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: "America/Sao_Paulo",
  });
  const corpo = await chamarGoogleJson<{ items?: EventoGoogle[] }>(
    accessToken,
    "Google Agenda",
    `${URL_EVENTOS}?${parametros}`,
  );
  return (corpo.items ?? []).map(paraReuniao);
}
