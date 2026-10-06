import Link from "next/link";

export const metadata = { title: "Acesso não autorizado" };

export default function PaginaAcessoNaoAutorizado() {
  return (
    <main className="tela-login">
      <div className="caixa">
        <p className="rotulo">Portal Perfin</p>
        <h1>Acesso não autorizado</h1>
        <p className="suave">
          Este e-mail não está na lista de administradores do Portal. Se precisar de acesso, fale com o responsável
          pelo sistema.
        </p>
        <Link href="/login" className="botao secundario">
          Entrar com outra conta
        </Link>
      </div>
    </main>
  );
}
