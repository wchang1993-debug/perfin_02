"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Mensagem {
  id: number;
  papel: "usuario" | "assistente";
  texto: string;
}

const SUGESTOES = [
  "Como a inflação se comportou em relação à meta?",
  "O CDI ganhou da inflação no período?",
  "Qual foi o comportamento do dólar no período?",
  "Resuma o período em 3 frases para um cliente.",
];

// Chat lateral: envia só a pergunta, o histórico e o filtro da URL; os dados são buscados no servidor.
export function ChatAssistente() {
  const parametros = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function perguntar(pergunta: string) {
    if (!pergunta.trim() || carregando) return;
    const historico = mensagens.map(({ papel, texto: t }) => ({ papel, texto: t }));
    const idResposta = Date.now() + 1;
    setMensagens((atual) => [...atual, { id: Date.now(), papel: "usuario", texto: pergunta }, { id: idResposta, papel: "assistente", texto: "" }]);
    setTexto("");
    setCarregando(true);
    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: pergunta,
          historico,
          filtro: {
            periodo: parametros.get("periodo") ?? "12m",
            inicio: parametros.get("inicio") ?? undefined,
            fim: parametros.get("fim") ?? undefined,
          },
        }),
      });
      if (!resposta.ok || !resposta.body) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "Não foi possível obter a resposta.");
      }
      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        const parte = decodificador.decode(value, { stream: true });
        setMensagens((atual) => atual.map((m) => (m.id === idResposta ? { ...m, texto: m.texto + parte } : m)));
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível obter a resposta.";
      setMensagens((atual) => atual.map((m) => (m.id === idResposta ? { ...m, texto: mensagem } : m)));
    } finally {
      setCarregando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void perguntar(texto);
  }

  if (!aberto) {
    return (
      <div className="assistente">
        <button type="button" className="botao" onClick={() => setAberto(true)}>
          Assistente
        </button>
      </div>
    );
  }

  return (
    <div className="assistente">
      <section className="assistente-janela" aria-label="Assistente de análise">
        <header style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--linha)" }}>
          <strong>Assistente</strong>
          <button type="button" className="botao secundario" onClick={() => setAberto(false)} aria-label="Fechar assistente">
            Fechar
          </button>
        </header>
        <div className="assistente-mensagens" aria-live="polite">
          {mensagens.length === 0 && (
            <div>
              <p className="suave pequeno">Responde com base nos dados do período filtrado nesta tela. Não faz recomendação de investimento.</p>
              {SUGESTOES.map((s) => (
                <button key={s} type="button" className="botao secundario pequeno" style={{ display: "block", marginBottom: 6, textAlign: "left" }} onClick={() => void perguntar(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {mensagens.map((m) => (
            <div key={m.id} className={`mensagem ${m.papel}`}>
              {m.texto || "…"}
            </div>
          ))}
        </div>
        <form onSubmit={enviar}>
          <label className="suave" style={{ flex: 1 }}>
            <span className="rotulo">Pergunta</span>
            <textarea rows={2} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <button type="submit" className="botao" disabled={carregando}>
            Enviar
          </button>
        </form>
      </section>
    </div>
  );
}
