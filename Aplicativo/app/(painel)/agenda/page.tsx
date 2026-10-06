import Link from "next/link";
import { obterUsuarioAdmin } from "@/lib/auth/sessao";
import { formatarData, formatarDataHora } from "@/lib/formatacao";
import { listarProximasReunioes, type Reuniao } from "@/lib/google/agenda";
import { ErroConexaoGoogleExpirada } from "@/lib/google/cliente";
import { obterAccessToken } from "@/lib/google/tokens";

export const metadata = { title: "Agenda" };

async function carregar(): Promise<{ reunioes: Reuniao[] } | { expirada: true }> {
  const usuario = await obterUsuarioAdmin();
  try {
    return { reunioes: await listarProximasReunioes(await obterAccessToken(usuario.id)) };
  } catch (erro) {
    if (erro instanceof ErroConexaoGoogleExpirada) return { expirada: true };
    throw erro;
  }
}

export default async function Agenda() {
  const resultado = await carregar();
  return (
    <>
      <p className="rotulo">Agenda</p>
      <h1>Próximas reuniões</h1>
      <section className="painel">
        {"expirada" in resultado ? (
          <p className="aviso">
            Sua conexão com o Google expirou (no modo de teste do Google isso ocorre a cada 7 dias).{" "}
            <Link href="/login?erro=google">Entre novamente</Link>.
          </p>
        ) : resultado.reunioes.length === 0 ? (
          <p className="suave">Nenhuma reunião futura na sua agenda principal.</p>
        ) : (
          <ul className="lista-filetes">
            {resultado.reunioes.map((r) => (
              <li key={r.id}>
                <strong>{r.titulo}</strong>
                <br />
                <span className="suave pequeno">
                  {r.diaInteiro ? `${formatarData(r.inicio)} (dia inteiro)` : `${formatarDataHora(r.inicio)} até ${formatarDataHora(r.fim)}`}
                  {r.participantes > 0 && ` · ${r.participantes} participantes`}
                </span>
                {r.linkMeet && (
                  <>
                    {" "}
                    · <a href={r.linkMeet} target="_blank" rel="noopener noreferrer">Google Meet</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
