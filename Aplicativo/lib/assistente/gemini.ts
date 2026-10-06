import "server-only";
import { GoogleGenAI } from "@google/genai";
import { envServidor } from "@/lib/env";
import { INSTRUCAO_SISTEMA, type Pergunta } from "./contexto";

// Responde em streaming (texto puro). O contexto com os dados é montado no servidor.
export async function responderEmStream(pergunta: Pergunta, contexto: string): Promise<ReadableStream<Uint8Array>> {
  const env = envServidor();
  const ia = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const historico = pergunta.historico.map((m) => ({
    role: m.papel === "usuario" ? "user" : "model",
    parts: [{ text: m.texto }],
  }));

  const fluxo = await ia.models.generateContentStream({
    model: env.GEMINI_MODEL,
    contents: [...historico, { role: "user", parts: [{ text: `DADOS:\n${contexto}\n\nPERGUNTA:\n${pergunta.mensagem}` }] }],
    config: { systemInstruction: INSTRUCAO_SISTEMA, temperature: 0.2 },
  });

  const codificador = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controle) {
      try {
        for await (const parte of fluxo) {
          if (parte.text) controle.enqueue(codificador.encode(parte.text));
        }
        controle.close();
      } catch (erro) {
        console.error(`[assistente] falha no streaming: ${erro instanceof Error ? erro.message : "desconhecida"}`);
        controle.enqueue(codificador.encode("\n\n[Não foi possível concluir a resposta. Tente novamente.]"));
        controle.close();
      }
    },
  });
}
