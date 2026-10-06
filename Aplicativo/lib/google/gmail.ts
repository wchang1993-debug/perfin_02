import { randomUUID } from "node:crypto";
import { chamarGoogleJson } from "./cliente";

// Só existe chamada ao endpoint de RASCUNHOS. O Portal nunca envia e-mail (regra de negócio A7).
export const URL_RASCUNHOS = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";

export interface Anexo {
  nome: string;
  mime: string;
  conteudo: Buffer;
}

export interface DadosRascunho {
  para?: string;
  assunto: string;
  corpoTexto: string;
  anexo: Anexo;
}

// Cabeçalhos com acentos precisam de codificação RFC 2047.
function cabecalhoUtf8(texto: string): string {
  return `=?UTF-8?B?${Buffer.from(texto, "utf8").toString("base64")}?=`;
}

function quebrarBase64(conteudo: Buffer): string {
  return (conteudo.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

export function montarMime(dados: DadosRascunho, fronteira = `perfin-${randomUUID()}`): string {
  if (/[\r\n]/.test(`${dados.para ?? ""}${dados.assunto}${dados.anexo.nome}`)) {
    throw new Error("Cabeçalho de e-mail inválido");
  }
  const linhas = [
    ...(dados.para ? [`To: ${dados.para}`] : []),
    `Subject: ${cabecalhoUtf8(dados.assunto)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${fronteira}"`,
    "",
    `--${fronteira}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    quebrarBase64(Buffer.from(dados.corpoTexto, "utf8")),
    "",
    `--${fronteira}`,
    `Content-Type: ${dados.anexo.mime}; name="${cabecalhoUtf8(dados.anexo.nome)}"`,
    `Content-Disposition: attachment; filename="${cabecalhoUtf8(dados.anexo.nome)}"`,
    "Content-Transfer-Encoding: base64",
    "",
    quebrarBase64(dados.anexo.conteudo),
    "",
    `--${fronteira}--`,
    "",
  ];
  return linhas.join("\r\n");
}

export async function criarRascunho(accessToken: string, dados: DadosRascunho): Promise<{ id: string }> {
  const raw = Buffer.from(montarMime(dados), "utf8").toString("base64url");
  return chamarGoogleJson<{ id: string }>(accessToken, "Gmail", URL_RASCUNHOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  });
}
