import { describe, expect, it } from "vitest";
import { normalizarUrlSite } from "@/lib/url-site";

describe("URL pública do Portal (NEXT_PUBLIC_SITE_URL)", () => {
  it("aceita a URL da Vercel e devolve só a origem", () => {
    expect(normalizarUrlSite("https://nome.vercel.app")).toBe("https://nome.vercel.app");
  });

  it("tolera barra final, espaços e maiúsculas no domínio", () => {
    expect(normalizarUrlSite("  https://Nome.Vercel.App/ ")).toBe("https://nome.vercel.app");
  });

  it("recusa valor ausente ou vazio", () => {
    expect(() => normalizarUrlSite(undefined)).toThrow("não definida");
    expect(() => normalizarUrlSite("   ")).toThrow("não definida");
  });

  it("recusa endereço sem protocolo", () => {
    expect(() => normalizarUrlSite("nome.vercel.app")).toThrow("inválida");
  });

  it("recusa http (o Portal roda só em https)", () => {
    expect(() => normalizarUrlSite("http://nome.vercel.app")).toThrow("https");
  });

  it("recusa caminho, parâmetros ou credenciais", () => {
    expect(() => normalizarUrlSite("https://nome.vercel.app/auth/callback")).toThrow("só o domínio");
    expect(() => normalizarUrlSite("https://nome.vercel.app/?x=1")).toThrow("só o domínio");
    expect(() => normalizarUrlSite("https://usuario:senha@nome.vercel.app")).toThrow("só o domínio");
  });
});
