const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  accounts: "Accounts",
  storeman: "Storeman",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
