// Aviso padrão quando uma fonte de mercado ainda não tem dados coletados.
export function SemDadosMercado({ fonte }: { fonte: string }) {
  return (
    <p className="aviso">
      Ainda não há dados de {fonte}. A coleta ANBIMA roda no workflow &quot;mercado&quot; do GitHub Actions quando a
      variável COLETA_ANBIMA_B3_ATIVA está como true (após a validação da licença).
    </p>
  );
}
