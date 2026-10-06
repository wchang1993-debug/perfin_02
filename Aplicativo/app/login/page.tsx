import { entrarComGoogle } from "./acoes";

export const metadata = { title: "Entrar" };

const MENSAGENS_ERRO: Record<string, string> = {
  inicio: "Não foi possível iniciar o login com o Google. Tente novamente.",
  callback: "Não foi possível concluir o login. Tente novamente.",
  google: "Sua conexão com o Google expirou. Entre novamente.",
};

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const mensagem = erro ? (MENSAGENS_ERRO[erro] ?? MENSAGENS_ERRO.callback) : null;

  return (
    <main className="tela-login">
      <div className="caixa">
        <p className="rotulo">Perfin Wealth Management</p>
        <h1>Portal Perfin</h1>
        <p className="suave">Central de análise de indicadores e mercado. Acesso restrito ao time.</p>
        {mensagem && (
          <p role="alert" className="erro">
            {mensagem}
          </p>
        )}
        <form action={entrarComGoogle}>
          <button type="submit" className="botao" style={{ width: "100%", marginTop: 16 }}>
            Entrar com Google
          </button>
        </form>
      </div>
    </main>
  );
}
