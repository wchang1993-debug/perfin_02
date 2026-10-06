import { describe, expect, it } from "vitest";
import { ehEmailAdmin, listaAdmins } from "@/lib/auth/admin";
import { filtroParaQuery, lerFiltro } from "@/lib/indicadores/filtro";

describe("lista de administradores", () => {
  it("normaliza maiúsculas e espaços", () => {
    const admins = listaAdmins(" Ana@Exemplo.com , bruno@exemplo.com,");
    expect(ehEmailAdmin("ana@exemplo.com", admins)).toBe(true);
    expect(ehEmailAdmin("  BRUNO@exemplo.com ", admins)).toBe(true);
  });

  it("nega quem não está na lista", () => {
    expect(ehEmailAdmin("intruso@exemplo.com", listaAdmins("ana@exemplo.com"))).toBe(false);
  });

  it("lista vazia ou indefinida nega todo mundo", () => {
    expect(ehEmailAdmin("ana@exemplo.com", listaAdmins(""))).toBe(false);
    expect(ehEmailAdmin("ana@exemplo.com", listaAdmins(undefined))).toBe(false);
  });

  it("e-mail vazio nunca é admin", () => {
    expect(ehEmailAdmin(null, listaAdmins("ana@exemplo.com"))).toBe(false);
    expect(ehEmailAdmin("", listaAdmins(""))).toBe(false);
  });
});

describe("filtro de período", () => {
  const hoje = new Date("2026-10-06T15:00:00Z");

  it("padrão é 12 meses terminando hoje", () => {
    expect(lerFiltro({}, hoje)).toEqual({ periodo: "12m", inicio: "2025-10-07", fim: "2026-10-06" });
  });

  it("atalhos de mês e ano", () => {
    expect(lerFiltro({ periodo: "mes" }, hoje).inicio).toBe("2026-10-01");
    expect(lerFiltro({ periodo: "ano" }, hoje).inicio).toBe("2026-01-01");
  });

  it("personalizado válido é respeitado", () => {
    expect(lerFiltro({ periodo: "personalizado", inicio: "2024-01-01", fim: "2024-06-30" }, hoje)).toEqual({
      periodo: "personalizado",
      inicio: "2024-01-01",
      fim: "2024-06-30",
    });
  });

  it("fim antes do início cai no padrão", () => {
    expect(lerFiltro({ periodo: "personalizado", inicio: "2024-06-30", fim: "2024-01-01" }, hoje).periodo).toBe("12m");
  });

  it("datas inválidas e período desconhecido caem no padrão", () => {
    expect(lerFiltro({ periodo: "xyz", inicio: "abc" }, hoje).periodo).toBe("12m");
    expect(lerFiltro({ periodo: "personalizado", inicio: "2024-13-01", fim: "2024-02-01" }, hoje).periodo).toBe("12m");
  });

  it("limita o fim a hoje e o período a 10 anos", () => {
    const f = lerFiltro({ periodo: "personalizado", inicio: "1990-01-01", fim: "2030-01-01" }, hoje);
    expect(f.fim).toBe("2026-10-06");
    expect(f.inicio).toBe("2016-10-06");
  });

  it("valores repetidos na URL usam o primeiro", () => {
    expect(lerFiltro({ periodo: ["ano", "mes"] }, hoje).periodo).toBe("ano");
  });

  it("serializa para a URL", () => {
    expect(filtroParaQuery({ periodo: "12m", inicio: "x", fim: "y" })).toBe("periodo=12m");
    expect(filtroParaQuery({ periodo: "personalizado", inicio: "2024-01-01", fim: "2024-02-01" })).toBe(
      "periodo=personalizado&inicio=2024-01-01&fim=2024-02-01",
    );
  });
});
