// Tela de fonte ainda não coletada (ANBIMA/B3 aguardam validação de licença — plano A9).
export function EmBreve({ titulo, onda, itens }: { titulo: string; onda: string; itens: string[] }) {
  return (
    <>
      <h1>{titulo}</h1>
      <section className="painel">
        <p className="aviso">
          Esta tela entra na {onda}, quando a coleta ANBIMA/B3 for ativada (variável COLETA_ANBIMA_B3_ATIVA). As tabelas
          no Supabase já existem, com RLS.
        </p>
        <p className="rotulo">O que vai aparecer aqui</p>
        <ul className="lista-filetes">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
