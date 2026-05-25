import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/maps/sign-out-button";

type AppShellProps = {
  email: string;
  children: ReactNode;
};

export function AppShell({ email, children }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <Link href="/maps">Mindmap Platform</Link>
        </div>
        <nav className="shell__nav">
          <Link href="/maps">Meus mapas</Link>
          <Link href="/chat">Chat IA</Link>
          <Link href="/projects">Gestão</Link>
          <Link href="/clients">Clientes</Link>
        </nav>
        <div className="shell__profile">
          <p>{email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="shell__content">{children}</main>
    </div>
  );
}
