import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM: formato "v1.<iv>.<tag>.<conteúdo>" em base64url. O GCM detecta adulteração
// (decifrar com chave errada ou texto alterado lança erro).
const ALGORITMO = "aes-256-gcm";
const VERSAO = "v1";

function chaveDe(base64: string): Buffer {
  const chave = Buffer.from(base64, "base64");
  if (chave.length !== 32) throw new Error("Chave de cifra deve ter 32 bytes");
  return chave;
}

export function cifrar(texto: string, chaveBase64: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv(ALGORITMO, chaveDe(chaveBase64), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv, tag, conteudo].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decifrar(pacote: string, chaveBase64: string): string {
  const [versao, iv, tag, conteudo] = pacote.split(".");
  if (versao !== VERSAO || !iv || !tag || !conteudo) throw new Error("Formato de token cifrado inválido");
  const decifra = createDecipheriv(ALGORITMO, chaveDe(chaveBase64), Buffer.from(iv, "base64url"));
  decifra.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, "base64url")), decifra.final()]).toString("utf8");
}
