import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ensureProfile, getProfile } from "@/lib/data/profiles";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();
  await ensureProfile(user);
  const profile = await getProfile(user.id);

  return (
    <AppShell
      email={user.email ?? "Usuário"}
      fullName={profile?.full_name ?? null}
      role={profile?.role_in_company ?? null}
    >
      {children}
    </AppShell>
  );
}
