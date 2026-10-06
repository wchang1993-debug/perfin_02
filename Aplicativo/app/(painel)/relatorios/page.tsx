import { FormularioAcao } from "@/components/FormularioAcao";
import { formatarDataHora, formatarMes } from "@/lib/formatacao";
import { ultimosValores } from "@/lib/indicadores/consultas";
import { mesPadrao } from "@/lib/relatorios/dados";
import { listarRelatorios } from "@/lib/relatorios/gerar";
import { criarRascunho, gerarRelatorio } from "./acoes";

export const metadata = { title: "Relatórios" };

export default async function Relatorios() {
  const [relatorios, ultimos] = await Promise.all([listarRelatorios(), ultimosValores()]);
  const padrao = mesPadrao(ultimos)?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);

  return (
    <>
      <p className="rotulo">Relatórios</p>
      <h1>Relatório do mês</h1>
      <section className="painel">
        <p className="suave">
          Gera uma Planilha Google na pasta &quot;Portal Perfin — Relatórios&quot; do seu Drive (Resumo, Destaques,
          Comparativo, Séries e Notas). O mês padrão é o último com IPCA divulgado.
        </p>
        <FormularioAcao acao={gerarRelatorio} rotuloBotao="Gerar relatório" rotuloLink="Abrir planilha">
          <label>
            Mês de referência
            <input type="month" name="mes" defaultValue={padrao} required />
          </label>
        </FormularioAcao>
      </section>

      <section className="painel">
        <h2>Gerados</h2>
        {relatorios.length === 0 ? (
          <p className="suave">Nenhum relatório gerado ainda.</p>
        ) : (
          <ul className="lista-filetes">
            {relatorios.map((r) => (
              <li key={r.id}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>{formatarMes(r.mes_referencia)}</strong>{" "}
                  <span className="selo">{r.status === "completo" ? "Completo" : "Preliminar"}</span>{" "}
                  <span className="suave pequeno">gerado em {formatarDataHora(r.criado_em)}</span>
                </p>
                <p style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}>
                  <a className="botao secundario" href={r.planilha_url} target="_blank" rel="noopener noreferrer">
                    Abrir no Google Planilhas
                  </a>
                  <a className="botao secundario" href={`/api/relatorios/${r.id}/xlsx`}>
                    Baixar .xlsx
                  </a>
                </p>
                <FormularioAcao acao={criarRascunho} rotuloBotao="Criar rascunho no Gmail" rotuloLink="Abrir rascunhos">
                  <input type="hidden" name="relatorioId" value={r.id} />
                  <label>
                    Destinatário (opcional)
                    <input type="email" name="destinatario" placeholder="nome@exemplo.com" />
                  </label>
                </FormularioAcao>
              </li>
            ))}
          </ul>
        )}
        <p className="suave pequeno">O Portal só cria rascunhos: o envio é sempre feito por você, no Gmail.</p>
      </section>
    </>
  );
}
