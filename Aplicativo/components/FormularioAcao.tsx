"use client";

import { useActionState } from "react";
import type { EstadoAcao } from "@/lib/estado-acao";

interface Props {
  acao: (anterior: EstadoAcao | null, formulario: FormData) => Promise<EstadoAcao>;
  rotuloBotao: string;
  rotuloLink?: string;
  children?: React.ReactNode;
}

// Formulário de Server Action com estado de envio e mensagem de resultado.
export function FormularioAcao({ acao, rotuloBotao, rotuloLink = "Abrir", children }: Props) {
  const [estado, executar, pendente] = useActionState(acao, null);
  return (
    <form action={executar} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
      {children}
      <button type="submit" className="botao" disabled={pendente}>
        {pendente ? "Processando…" : rotuloBotao}
      </button>
      {estado && (
        <p role="status" className={estado.ok ? "pequeno" : "erro pequeno"} style={{ flexBasis: "100%", margin: 0 }}>
          {estado.mensagem}{" "}
          {estado.url && (
            <a href={estado.url} target="_blank" rel="noopener noreferrer">
              {rotuloLink}
            </a>
          )}
        </p>
      )}
    </form>
  );
}
