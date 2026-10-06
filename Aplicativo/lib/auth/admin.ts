// Regra de acesso: só entram os e-mails listados em ADMIN_EMAILS (separados por vírgula).

export function listaAdmins(valor: string | undefined): Set<string> {
  return new Set(
    (valor ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function ehEmailAdmin(email: string | null | undefined, admins: Set<string>): boolean {
  if (!email) return false;
  return admins.has(email.trim().toLowerCase());
}
