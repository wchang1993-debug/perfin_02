export const metadata = { title: "Sem conexão" };

export default function PaginaOffline() {
  return (
    <main className="tela-login">
      <div className="caixa">
        <p className="rotulo">Portal Perfin</p>
        <h1>Sem conexão</h1>
        <p className="suave">
          Os dados do Portal não ficam guardados no aparelho. Conecte-se à internet e tente novamente.
        </p>
      </div>
    </main>
  );
}
