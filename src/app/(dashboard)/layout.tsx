import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ensureProfile } from "@/lib/data/profiles";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();
  await ensureProfile(user);

  return <AppShell email={user.email ?? "Usuário"}>{children}</AppShell>;
}
