import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paraReuniao } from "@/lib/google/agenda";
import { cifrar, decifrar } from "@/lib/google/cifra";
import { ErroConexaoGoogleExpirada, ErroGoogle, chamarGoogle } from "@/lib/google/cliente";
import { URL_RASCUNHOS, criarRascunho, montarMime } from "@/lib/google/gmail";

const CHAVE = randomBytes(32).toString("base64");

describe("cifra do refresh token", () => {
  it("cifra e decifra de volta", () => {
    const pacote = cifrar("token-ficticio-123", CHAVE);
    expect(pacote).not.toContain("token-ficticio-123");
    expect(decifrar(pacote, CHAVE)).toBe("token-ficticio-123");
  });

  it("cada cifra usa IV diferente", () => {
    expect(cifrar("x", CHAVE)).not.toBe(cifrar("x", CHAVE));
  });

  it("falha com chave errada", () => {
    const pacote = cifrar("token", CHAVE);
    expect(() => decifrar(pacote, randomBytes(32).toString("base64"))).toThrow();
  });

  it("falha se o conteúdo foi adulterado", () => {
    const partes = cifrar("token", CHAVE).split(".");
    partes[3] = Buffer.from("outro").toString("base64url");
    expect(() => decifrar(partes.join("."), CHAVE)).toThrow();
  });

  it("rejeita chave de tamanho errado", () => {
    expect(() => cifrar("x", randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("rascunho do Gmail", () => {
  const dados = {
    para: "destino@exemplo.com",
    assunto: "Indicadores — out/2026",
    corpoTexto: "Olá,\nsegue o relatório.",
    anexo: { nome: "relatorio.xlsx", mime: "application/octet-stream", conteudo: Buffer.from("conteudo-ficticio") },
  };

  it("monta MIME multipart com anexo e assunto codificado", () => {
    const mime = montarMime(dados, "fronteira-teste");
    expect(mime).toContain("To: destino@exemplo.com");
    expect(mime).toContain("Subject: =?UTF-8?B?");
    expect(mime).toContain('Content-Type: multipart/mixed; boundary="fronteira-teste"');
    expect(mime).toContain(Buffer.from("conteudo-ficticio").toString("base64"));
    expect(mime.trimEnd().endsWith("--fronteira-teste--")).toBe(true);
  });

  it("omite o destinatário quando não informado", () => {
    expect(montarMime({ ...dados, para: undefined })).not.toContain("To:");
  });

  it("bloqueia injeção de cabeçalho", () => {
    expect(() => montarMime({ ...dados, para: "a@exemplo.com\r\nBcc: b@exemplo.com" })).toThrow();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("só chama o endpoint de rascunhos, nunca o de envio", async () => {
    const chamadas: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      chamadas.push(url);
      return new Response(JSON.stringify({ id: "r1" }), { status: 200 });
    }));
    await criarRascunho("token", dados);
    expect(chamadas).toEqual([URL_RASCUNHOS]);
    expect(chamadas.some((u) => u.includes("/send") || u.includes("/messages"))).toBe(false);
  });
});

describe("cliente Google", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("401 vira conexão expirada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(chamarGoogle("t", "Teste", "https://exemplo.com")).rejects.toBeInstanceOf(ErroConexaoGoogleExpirada);
  });

  it("outros erros HTTP viram ErroGoogle", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(chamarGoogle("t", "Teste", "https://exemplo.com")).rejects.toBeInstanceOf(ErroGoogle);
  });
});

describe("agenda", () => {
  it("não expõe e-mails dos participantes", () => {
    const r = paraReuniao({
      id: "1",
      summary: "Comitê",
      start: { dateTime: "2026-10-07T10:00:00-03:00" },
      end: { dateTime: "2026-10-07T11:00:00-03:00" },
      attendees: [{ email: "a@exemplo.com" }, { email: "b@exemplo.com" }],
    });
    expect(r).toEqual({
      id: "1",
      titulo: "Comitê",
      inicio: "2026-10-07T10:00:00-03:00",
      fim: "2026-10-07T11:00:00-03:00",
      diaInteiro: false,
      linkMeet: null,
      participantes: 2,
    });
    expect(JSON.stringify(r)).not.toContain("@");
  });

  it("evento de dia inteiro e sem título", () => {
    const r = paraReuniao({ id: "2", start: { date: "2026-10-08" }, end: { date: "2026-10-09" } });
    expect(r.diaInteiro).toBe(true);
    expect(r.titulo).toBe("(sem título)");
  });
});
