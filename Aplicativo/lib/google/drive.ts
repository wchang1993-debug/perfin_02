import { chamarGoogle, chamarGoogleJson } from "./cliente";

const URL_ARQUIVOS = "https://www.googleapis.com/drive/v3/files";
const MIME_PASTA = "application/vnd.google-apps.folder";
export const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Com o scope drive.file o app só enxerga o que ele mesmo criou; a busca pela pasta
// retorna apenas a pasta criada pelo Portal.
export async function garantirPasta(accessToken: string, nome: string): Promise<string> {
  const consulta = `name = '${nome.replace(/'/g, "\\'")}' and mimeType = '${MIME_PASTA}' and trashed = false`;
  const busca = await chamarGoogleJson<{ files?: { id: string }[] }>(
    accessToken,
    "Google Drive",
    `${URL_ARQUIVOS}?${new URLSearchParams({ q: consulta, fields: "files(id)", pageSize: "1" })}`,
  );
  const existente = busca.files?.[0]?.id;
  if (existente) return existente;

  const criada = await chamarGoogleJson<{ id: string }>(accessToken, "Google Drive", URL_ARQUIVOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, mimeType: MIME_PASTA }),
  });
  return criada.id;
}

export async function moverParaPasta(accessToken: string, arquivoId: string, pastaId: string): Promise<void> {
  const atual = await chamarGoogleJson<{ parents?: string[] }>(
    accessToken,
    "Google Drive",
    `${URL_ARQUIVOS}/${arquivoId}?fields=parents`,
  );
  const parametros = new URLSearchParams({ addParents: pastaId, removeParents: (atual.parents ?? []).join(",") });
  await chamarGoogle(accessToken, "Google Drive", `${URL_ARQUIVOS}/${arquivoId}?${parametros}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export async function exportarXlsx(accessToken: string, arquivoId: string): Promise<ArrayBuffer> {
  const resposta = await chamarGoogle(
    accessToken,
    "Google Drive",
    `${URL_ARQUIVOS}/${arquivoId}/export?${new URLSearchParams({ mimeType: MIME_XLSX })}`,
  );
  return resposta.arrayBuffer();
}
