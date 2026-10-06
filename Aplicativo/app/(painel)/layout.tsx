import Link from "next/link";
import { Suspense } from "react";
import { ChatAssistente } from "@/components/ChatAssistente";
import { Navegacao } from "@/components/Navegacao";
import { exigirAdminNaPagina } from "@/lib/auth/sessao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await exigirAdminNaPagina();
  return (
    <>
      <header className="barra-topo">
        <Link href="/" className="marca">
          Portal Perfin<small>Wealth Management</small>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pequeno" style={{ color: "#BCBEC0" }}>
            {usuario.nome}
          </span>
          <form action="/auth/sair" method="post">
            <button type="submit">Sair</button>
          </form>
        </div>
      </header>
      <div className="estrutura">
        <Navegacao variante="lateral" />
        <main className="conteudo">{children}</main>
      </div>
      <Navegacao variante="inferior" />
      <Suspense fallback={null}>
        <ChatAssistente />
      </Suspense>
      <footer className="legal">
        Material de uso interno. Dados públicos do Banco Central do Brasil e do Tesouro Nacional. Não constitui
        recomendação de investimento.
      </footer>
    </>
  );
}
