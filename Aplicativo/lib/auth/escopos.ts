// Scopes do Google pedidos no login (ver plano, seção B3). Menor conjunto que atende às funções.
export const ESCOPOS_GOOGLE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.compose",
] as const;
