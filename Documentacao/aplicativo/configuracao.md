# Configuração e implantação

O Portal roda **somente** pela URL da Vercel. A URL pública vem de `NEXT_PUBLIC_SITE_URL`.

## 1. Vercel
1. Importe o repositório e defina **Root Directory = `Aplicativo`** (framework: Next.js).
2. Cadastre as variáveis (Settings → Environment Variables → Production), com os nomes do bloco "Vercel" de `.env.example`:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `ADMIN_EMAILS`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
3. Depois de saber a URL (`https://<app>.vercel.app`), ajuste `NEXT_PUBLIC_SITE_URL` e **refaça o deploy**.
   - Formato: só o domínio, com `https://` (ex.: `https://nome.vercel.app`). Barra final e espaços são ignorados;
     `http://`, caminho (`/auth/callback`) ou parâmetros fazem o app falhar com mensagem explicando o erro.
   - Variáveis `NEXT_PUBLIC_*` entram no build: mudar o valor sem refazer o deploy não tem efeito.
   - Se a URL mudar (domínio próprio, outro projeto), atualize também as origens no Google e a URL Configuration no
     Supabase (seções 2 e 3) com o mesmo domínio.

## 2. Google Cloud Console
1. Crie o projeto e ative as APIs **Google Calendar**, **Google Drive**, **Google Sheets** e **Gmail**.
2. Google Auth Platform:
   - **Branding**: nome "Portal Perfin", e-mail de suporte, página inicial `https://<app>.vercel.app`.
   - **Audience**: External, status **Testing**; adicione como *Test users* os e-mails de `ADMIN_EMAILS`.
   - **Data Access**: `openid`, `email`, `profile`, `.../auth/calendar.events.readonly`, `.../auth/drive.file`, `.../auth/gmail.compose`.
3. **Clients → Create client → Web application**:
   - Authorized JavaScript origins: `https://<app>.vercel.app`
   - Authorized redirect URIs: `https://<ref-do-projeto>.supabase.co/auth/v1/callback` (URL do Supabase, não da Vercel)
4. Copie o Client ID e o Client Secret para o Supabase (abaixo) e para a Vercel.

Em modo Testing o Google mostra a tela "app não verificado" e o refresh token expira em 7 dias: cada pessoa
refaz o login uma vez por semana para usar Agenda, Relatórios e Gmail.

## 3. Supabase (projeto perfin_02)
1. Authentication → Sign In / Providers → **Google**: ative e cole o Client ID e o Client Secret. Desative Email.
2. Authentication → URL Configuration:
   - **Site URL**: `https://<app>.vercel.app`
   - **Redirect URLs**: `https://<app>.vercel.app/auth/callback`
3. Project Settings → API Keys: crie uma **Secret key** e use em `SUPABASE_SECRET_KEY` (Vercel e GitHub).
4. As tabelas já foram criadas pelas migrations (`Aplicativo/supabase/migrations/`), todas com RLS.
   Para aplicar novas migrations: `python Aplicativo/supabase/aplicar_migrations.py` com `DATABASE_URL`
   (use a conexão do *pooler* se a conexão direta não resolver na sua rede).

## 4. GitHub Actions (coleta diária)
1. Settings → Secrets and variables → Actions:
   - Secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
   - Variable: `COLETA_ANBIMA_B3_ATIVA` = `false` (até validar a licença ANBIMA/B3).
2. Rode o workflow **Coleta de indicadores** manualmente com o grupo `macro` para a carga inicial (5 anos do BCB e
   todo o histórico do Tesouro Direto). Depois ele roda sozinho às 09:00 BRT; falhas chegam por e-mail.
3. Depois de validar a licença ANBIMA, mude `COLETA_ANBIMA_B3_ATIVA` para `true`. O grupo `mercado` roda às
   21:30 BRT em dias úteis e coleta títulos públicos, curvas (ETTJ), índices IMA e debêntures. Os arquivos públicos
   da ANBIMA trazem só os últimos dias (o IMA, só o último): o histórico se forma a partir da primeira coleta.

## Gerar a chave de cifra
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
