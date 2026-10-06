import { describe, expect, it } from "vitest";
import { esquemaPergunta } from "@/lib/assistente/contexto";
import { decisoesSeguidas, destaquesMacro, type DadosMacro } from "@/lib/destaques/macro";
import { priorizar, type Destaque } from "@/lib/destaques/tipos";
import { formatarBps, formatarMes, formatarPercentual, formatarPp, formatarReais } from "@/lib/formatacao";
import { diferencaSeries, mesclarSeries } from "@/lib/indicadores/graficos";
import { corpoEmail, montarAbas, statusDoRelatorio, type DadosRelatorio, type LinhaResumo } from "@/lib/relatorios/conteudo";

const VAZIO: DadosMacro = {
  meta: null,
  ipcaUltimo: null,
  ipca15Ultimo: null,
  juroReal12m: null,
  igpm12m: null,
  ipca12m: null,
  cambio: null,
  poupancaPercentualCdi: null,
  selicAtual: null,
  decisoes: [],
};

describe("formatação pt-BR", () => {
  it("percentuais, p.p., bps e reais", () => {
    expect(formatarPercentual(0.56)).toBe("0,56%");
    expect(formatarPercentual(4.2, 1, true)).toBe("+4,2%");
    expect(formatarPp(-2.1)).toBe("-2,10 p.p.");
    expect(formatarBps(12)).toBe("+12 bps");
    expect(formatarReais(10523.18).replace(/\s/g, " ")).toBe("R$ 10.523,18");
    expect(formatarReais(5.4321, 4).replace(/\s/g, " ")).toBe("R$ 5,4321");
  });

  it("valores ausentes viram travessão", () => {
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarPercentual("abc")).toBe("—");
  });

  it("mês abreviado", () => {
    expect(formatarMes("2026-10-01")).toBe("out/2026");
  });
});

describe("destaques automáticos", () => {
  it("IPCA acima do teto por 6 meses é atenção máxima", () => {
    const [d] = destaquesMacro({
      ...VAZIO,
      meta: { mes: "2026-08-01", ipca_12m: 5.1, centro: 3, piso: 1.5, teto: 4.5, status: "acima_do_teto", meses_fora: 6 },
    });
    expect(d?.severidade).toBe("atencao");
    expect(d?.raridade).toBe(2);
    expect(d?.texto).toContain("6º mês seguido");
    expect(d?.texto).toContain("descumprimento");
  });

  it("IPCA dentro da meta é informativo", () => {
    const [d] = destaquesMacro({
      ...VAZIO,
      meta: { mes: "2026-08-01", ipca_12m: 3.2, centro: 3, piso: 1.5, teto: 4.5, status: "dentro_da_meta", meses_fora: 0 },
    });
    expect(d?.severidade).toBe("informativo");
  });

  it("câmbio só vira destaque a partir de 3% de variação", () => {
    const cambio = { primeiro: 5, ultimo: 5.1, variacao: 2.9, maximo: 5.2, data_maximo: "2026-09-10", minimo: 5, data_minimo: "2026-09-01", media: 5.1, volatilidade_aa: 12 };
    expect(destaquesMacro({ ...VAZIO, cambio })).toHaveLength(0);
    expect(destaquesMacro({ ...VAZIO, cambio: { ...cambio, variacao: -3.1 } })[0]?.id).toBe("cambio");
  });

  it("spread IGP-M × IPCA abaixo de 1 p.p. não aparece", () => {
    expect(destaquesMacro({ ...VAZIO, igpm12m: 4.4, ipca12m: 4.0 })).toHaveLength(0);
    expect(destaquesMacro({ ...VAZIO, igpm12m: 2.0, ipca12m: 4.1 })[0]?.texto).toContain("sobem menos");
  });

  it("prévia do IPCA só quando o IPCA-15 é mais recente que o IPCA", () => {
    const ipcaUltimo = { data: "2026-09-01", valor: 0.4 };
    expect(destaquesMacro({ ...VAZIO, ipcaUltimo, ipca15Ultimo: { data: "2026-09-01", valor: 0.3 } })).toHaveLength(0);
    expect(destaquesMacro({ ...VAZIO, ipcaUltimo, ipca15Ultimo: { data: "2026-10-01", valor: 0.3 } })[0]?.texto).toContain("desaceleração");
  });

  it("conta decisões seguidas na mesma direção", () => {
    const d = (data: string, v: number) => ({ data, selic_anterior: 0, selic_nova: 0, variacao_pp: v });
    expect(decisoesSeguidas([d("a", 0.5), d("b", -0.5), d("c", -0.25), d("e", -0.5)])).toEqual({ direcao: "corte", quantidade: 3 });
    expect(decisoesSeguidas([])).toBeNull();
  });

  it("prioriza atenção e limita a quantidade", () => {
    const lista: Destaque[] = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, severidade: "informativo", raridade: 0, texto: "" }));
    lista.push({ id: "alerta", severidade: "atencao", raridade: 0, texto: "" });
    const resultado = priorizar(lista);
    expect(resultado).toHaveLength(6);
    expect(resultado[0]?.id).toBe("alerta");
  });
});

describe("séries para gráficos", () => {
  it("mescla por data em ordem", () => {
    expect(mesclarSeries({ A: [{ data: "2026-02-01", valor: 2 }, { data: "2026-01-01", valor: 1 }], B: [{ data: "2026-01-01", valor: 3 }] })).toEqual([
      { data: "2026-01-01", A: 1, B: 3 },
      { data: "2026-02-01", A: 2 },
    ]);
  });

  it("diferença só nas datas comuns", () => {
    expect(diferencaSeries([{ data: "a", valor: 5 }, { data: "b", valor: 1 }], [{ data: "a", valor: 3 }])).toEqual([{ data: "a", valor: 2 }]);
  });
});

describe("relatório do mês", () => {
  const linha = (codigo: string, valorMes: number | null): LinhaResumo => ({ codigo, nome: codigo, unidade: "%", valorMes, noAno: 1, em12m: 2, mesAnterior: 0.1 });

  it("completo quando todos os indicadores mensais foram divulgados", () => {
    expect(statusDoRelatorio([linha("IPCA", 0.4), linha("IGPM", 0.1), linha("USD", null)])).toEqual({ status: "completo", faltantes: [] });
  });

  it("preliminar lista o que falta", () => {
    expect(statusDoRelatorio([linha("IPCA", null), linha("IGPM", 0.1)])).toEqual({ status: "preliminar", faltantes: ["IPCA"] });
  });

  it("monta as cinco abas com aviso legal", () => {
    const dados: DadosRelatorio = {
      mes: "2026-09-01",
      geradoEm: "06/10/2026",
      resumo: [linha("IPCA", 0.4)],
      meta: null,
      destaques: [{ id: "x", severidade: "informativo", raridade: 0, texto: "Destaque fictício" }],
      comparativoAno: [],
      comparativo12m: [],
      series: [{ codigo: "IPCA", nome: "IPCA", pontos: [{ data: "2026-09-01", valor: 0.4 }] }],
    };
    const abas = montarAbas(dados);
    expect(abas.map((a) => a.nome)).toEqual(["Resumo", "Destaques", "Comparativo", "Séries", "Notas"]);
    expect(JSON.stringify(abas.at(-1))).toContain("Não constitui recomendação de investimento");
  });

  it("e-mail traz no máximo 5 destaques e o aviso", () => {
    const destaques = Array.from({ length: 7 }, (_, i) => ({ id: `${i}`, severidade: "informativo" as const, raridade: 0, texto: `D${i}` }));
    const corpo = corpoEmail({ mes: "2026-09-01", destaques, urlPlanilha: "https://exemplo.com/planilha" });
    expect(corpo.match(/^• /gm)).toHaveLength(5);
    expect(corpo).toContain("Não constitui recomendação de investimento");
  });
});

describe("entrada do assistente", () => {
  it("aceita pergunta válida", () => {
    expect(esquemaPergunta.safeParse({ mensagem: "Como foi o IPCA?", filtro: { periodo: "12m" } }).success).toBe(true);
  });

  it("rejeita mensagem vazia, longa demais ou histórico excessivo", () => {
    expect(esquemaPergunta.safeParse({ mensagem: "  ", filtro: { periodo: "12m" } }).success).toBe(false);
    expect(esquemaPergunta.safeParse({ mensagem: "x".repeat(2001), filtro: { periodo: "12m" } }).success).toBe(false);
    const historico = Array.from({ length: 21 }, () => ({ papel: "usuario", texto: "oi" }));
    expect(esquemaPergunta.safeParse({ mensagem: "oi", historico, filtro: { periodo: "12m" } }).success).toBe(false);
  });

  it("não aceita dados enviados pelo navegador além do filtro", () => {
    const r = esquemaPergunta.safeParse({ mensagem: "oi", filtro: { periodo: "12m" }, dados: { ipca: 99 } });
    expect(r.success && "dados" in r.data).toBe(false);
  });
});
