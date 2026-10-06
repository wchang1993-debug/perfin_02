import "server-only";
import { z } from "zod";
import { normalizarUrlSite } from "./url-site";

// Variáveis só do servidor. Validadas na primeira leitura: falha cedo e com mensagem clara
// (sem expor valores) se o deploy estiver sem alguma configuração.
const esquemaServidor = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().transform((valor, ctx) => {
    try {
      return normalizarUrlSite(valor);
    } catch (erro) {
      ctx.addIssue({ code: "custom", message: erro instanceof Error ? erro.message : "inválida" });
      return z.NEVER;
    }
  }),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // 32 bytes em base64 (AES-256-GCM).
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "deve ter 32 bytes em base64"),
  ADMIN_EMAILS: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
});

export type EnvServidor = z.infer<typeof esquemaServidor>;

let cache: EnvServidor | undefined;

export function envServidor(): EnvServidor {
  if (cache) return cache;
  const resultado = esquemaServidor.safeParse(process.env);
  if (!resultado.success) {
    const campos = resultado.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Configuração de ambiente inválida ou ausente: ${campos}`);
  }
  cache = resultado.data;
  return cache;
}
