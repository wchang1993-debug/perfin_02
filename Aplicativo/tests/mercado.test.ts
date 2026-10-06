import { describe, expect, it } from "vitest";
import { linhasContextoMercado } from "@/lib/assistente/contexto-mercado";
import { unirComparativo } from "@/lib/comparativo";
import { destaquesMercado, type DadosMercado } from "@/lib/destaques/mercado";
import { mesclarCurvas } from "@/lib/mercado/curvas";
import type { Deslocamento } from "@/lib/mercado/tipos";
import { abasMercado, temDadosAnbima, type DadosMercadoRelatorio } from "@/lib/relatorios/conteudo-mercado";
import { avisoLegal } from "@/lib/relatorios/conteudo";

// Dados fictícios.
const vertice = (du: number, pre: number, pre5d: number | null, implicita = 5): Deslocamento => ({
  du, pre, real: 6.5, implicita,
  pre_1d: 0, pre_5d: pre5d, pre_21d: 0, pre_252d: 0, real_1d: 0, real_5d: 0, real_21d: 0, real_252d: 0,
});

const VAZIO: DadosMercado = {
  deslocamentos: [],
  tetoMeta: 4.5,
  titulos: [],
  spreadVarejo: [],
  imaB: null,
  medianasIpca: [],
  variacoesDebentures: [],
};

describe("destaques de mercado", () => {
  it("inclinação só aparece a partir de 15 bps na semana", () => {
    const pouco = { ...VAZIO, deslocamentos: [vertice(504, 12, 5), vertice(2520, 12.8, 15)] };
    expect(destaquesMercado(pouco).find((d) => d.id === "inclinacao")).toBeUndefined();
    const muito = { ...VAZIO, deslocamentos: [vertice(504, 12, -5), vertice(2520, 12.8, 15)] };
    const d = destaquesMercado(muito).find((x) => x.id === "inclinacao");
    expect(d?.texto).toContain("inclinou");
    expect(d?.texto).toContain("80 bps");
  });

  it("implícita de 5 anos acima do teto é atenção", () => {
    const acima = destaquesMercado({ ...VAZIO, deslocamentos: [vertice(1260, 12, 0, 5.4)] });
    expect(acima.find((d) => d.id === "implicita")?.severidade).toBe("atencao");
    const dentro = destaquesMercado({ ...VAZIO, deslocamentos: [vertice(1260, 12, 0, 4.0)] });
    expect(dentro.find((d) => d.id === "implicita")?.severidade).toBe("informativo");
  });

  it("debênture só vira alerta com variação de 100 bps ou mais", () => {
    const v = (codigo: string, bps: number) => ({ codigo, emissor: "Ficticia", indexador: "DI+", taxa_anterior: 1, taxa_atual: 2, variacao_bps: bps });
    const ds = destaquesMercado({ ...VAZIO, variacoesDebentures: [v("A11", 180), v("B11", -99)] });
    expect(ds.map((d) => d.id)).toEqual(["deb-A11"]);
    expect(ds[0]?.severidade).toBe("atencao");
  });

  it("spread de crédito abrindo é atenção; fechando é informativo", () => {
    const m = (data: string, mediana: number) => ({ data, indexador: "IPCA+", mediana, quantidade: 600 });
    expect(destaquesMercado({ ...VAZIO, medianasIpca: [m("a", 40), m("b", 55)] })[0]?.severidade).toBe("atencao");
    expect(destaquesMercado({ ...VAZIO, medianasIpca: [m("a", 55), m("b", 40)] })[0]?.texto).toContain("fechou 15 bps");
    expect(destaquesMercado({ ...VAZIO, medianasIpca: [m("a", 40), m("b", 45)] })).toHaveLength(0);
  });

  it("spread do varejo destaca o maior positivo", () => {
    const s = (titulo: string, spread_bps: number) => ({ titulo, vencimento: "2035-05-15", tipo_anbima: "NTN-B", taxa_tesouro: 7, taxa_anbima: 7.1, spread_bps });
    const d = destaquesMercado({ ...VAZIO, spreadVarejo: [s("Tesouro IPCA+", 5), s("Tesouro IPCA+ com Juros Semestrais", 12)] });
    expect(d[0]?.texto).toContain("Juros Semestrais");
    expect(destaquesMercado({ ...VAZIO, spreadVarejo: [s("Tesouro IPCA+", -3)] })).toHaveLength(0);
  });
});

describe("curvas e comparativo", () => {
  it("mescla curvas de datas diferentes por prazo, ignorando vértices vazios", () => {
    const linhas = mesclarCurvas(
      { hoje: [{ du: 252, pre: 12, real: 6, implicita: 5 }, { du: 504, pre: null, real: 6.5, implicita: null }], antes: [{ du: 252, pre: 11, real: 6, implicita: 5 }] },
      "pre",
    );
    expect(linhas).toEqual([{ du: 252, hoje: 12, antes: 11 }]);
  });

  it("ranking une BCB e ANBIMA com % do CDI", () => {
    const ranking = unirComparativo(
      [
        { codigo: "CDI", nome: "CDI", rentabilidade: 10, valor_final: 11000 },
        { codigo: "IPCA", nome: "IPCA", rentabilidade: 4, valor_final: 10400 },
      ],
      [{ indice: "IMA-B", rentabilidade: 12, valor_final: 11200, duration_du: 1700 }],
    );
    expect(ranking.map((l) => l.chave)).toEqual(["IMA-B", "CDI", "IPCA"]);
    expect(ranking[0]).toMatchObject({ fonte: "ANBIMA", percentualCdi: 120 });
    expect(ranking[1]?.percentualCdi).toBe(100);
  });

  it("sem CDI no período, % do CDI fica indisponível", () => {
    const ranking = unirComparativo([], [{ indice: "IMA-B", rentabilidade: 1, valor_final: 10100, duration_du: null }]);
    expect(ranking[0]?.percentualCdi).toBeNull();
  });
});

describe("relatório com dados de mercado", () => {
  const completo: DadosMercadoRelatorio = {
    curvas: { data: "2030-01-31", dataBase: "2029-12-31", vertices: [{ du: 252, pre: 12, real: 6, implicita: 5.6, delta_pre: 10, delta_real: -5, delta_implicita: 15 }] },
    rendaFixa: { data: "2030-01-31", indices: [{ data: "2030-01-31", indice: "IMA-B", numero_indice: 1, variacao_dia: 0, variacao_mes: 2, variacao_ano: 2, variacao_12m: 9, duration_du: 1700 }], cdiMes: 1, titulos: [] },
    credito: { data: "2030-01-31", dataBase: null, spreads: [{ indexador: "IPCA+", quantidade: 600, p25: 10, mediana: 40, p75: 90, delta_mediana: null }], variacoes: [] },
    tesouro: { data: "2030-01-31", titulos: [{ data: "2030-01-31", titulo: "Tesouro IPCA+", vencimento: "2035-05-15", taxa_compra: 7, taxa_venda: 7.1, pu_compra: 2000, pu_venda: 1990 }], varejo: [] },
  };

  it("cria uma aba por fonte com dados", () => {
    expect(abasMercado(completo).map((a) => a.nome)).toEqual(["Curvas", "Renda fixa", "Crédito", "Tesouro Direto"]);
  });

  it("omite abas sem dados e aceita ausência total", () => {
    expect(abasMercado({ ...completo, curvas: null, credito: null }).map((a) => a.nome)).toEqual(["Renda fixa", "Tesouro Direto"]);
    expect(abasMercado(null)).toEqual([]);
  });

  it("IMA-B do mês em % do CDI na aba de renda fixa", () => {
    const aba = abasMercado(completo).find((a) => a.nome === "Renda fixa");
    expect(aba?.linhas[1]).toEqual(["IMA-B", 2, 200, 2, 9, 1700]);
  });

  it("aviso legal cita a ANBIMA só quando há dados dela", () => {
    expect(temDadosAnbima(completo)).toBe(true);
    expect(temDadosAnbima({ ...completo, curvas: null, rendaFixa: null, credito: null })).toBe(false);
    expect(avisoLegal(true)).toContain("ANBIMA");
    expect(avisoLegal(false)).not.toContain("ANBIMA");
    expect(avisoLegal(false)).toContain("Não constitui recomendação de investimento");
  });
});

describe("contexto de mercado do assistente", () => {
  it("avisa quando não há dados ANBIMA", () => {
    expect(linhasContextoMercado(null).join("\n")).toContain("sem dados ANBIMA");
  });

  it("limita a lista de debêntures a 5 itens", () => {
    const variacoes = Array.from({ length: 8 }, (_, i) => ({ codigo: `D${i}`, emissor: "Ficticia", indexador: "DI+", taxa_anterior: 1, taxa_atual: 1, variacao_bps: i }));
    const texto = linhasContextoMercado({ datas: { debentures: "2030-01-02" }, dados: { ...VAZIO, variacoesDebentures: variacoes } }).join("\n");
    expect(texto).toContain("D4");
    expect(texto).not.toContain("D5");
  });
});
