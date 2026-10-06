# 0001 — Login com Google via Supabase Auth e tokens cifrados

- **Data:** 06/10/2026
- **Status:** aceita

## Contexto
O Portal precisa de login com Google restrito a uma lista de administradores e, além do login, acessar Agenda,
Drive, Planilhas e Gmail do usuário. Os dados ficam no Supabase com RLS.

## Decisão
- Usar o **Supabase Auth com o provedor Google**, para que o RLS funcione com `auth.uid()`/`auth.jwt()`.
- Pedir os scopes no login com `access_type=offline` e `prompt=consent`; no callback, guardar o
  `provider_refresh_token` **cifrado com AES-256-GCM** (`GOOGLE_TOKEN_ENCRYPTION_KEY`) em `google_credenciais`,
  tabela com RLS e sem políticas (só o servidor acessa).
- `ADMIN_EMAILS` é a fonte da regra de acesso; o callback espelha os admins em `administradores`, consultada pela
  função `eh_admin()` nas políticas de RLS. Não admins têm a sessão encerrada e o usuário apagado.
- APIs do Google chamadas por `fetch` (REST), sem o pacote `googleapis`.

## Alternativas consideradas
- **Auth.js (NextAuth) com Supabase só como banco**: perderia o RLS por usuário; descartada.
- **Guardar só o access token**: expira em 1 hora; descartada.
- **Scope `spreadsheets`**: desnecessário, `drive.file` cobre planilhas criadas pelo app e é não sensível.

## Consequências
- App Google em modo Testing: refresh token expira em 7 dias e o usuário refaz o login semanalmente.
- `gmail.compose` é scope restrito; sair do modo Testing exigiria avaliação de segurança do Google.
- A secret key do Supabase é usada só no servidor, para credenciais, espelho de admins e remoção de não autorizados.
