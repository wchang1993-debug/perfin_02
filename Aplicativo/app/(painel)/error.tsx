"use client";

export default function ErroPainel({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="erro" role="alert">
      <h2>Não foi possível carregar esta tela</h2>
      <p>Tente novamente em instantes. Se o problema continuar, verifique a coleta de dados e a configuração do Portal.</p>
      <button type="button" className="botao" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
