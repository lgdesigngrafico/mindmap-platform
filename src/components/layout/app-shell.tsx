import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/maps/sign-out-button";
import { NavLinks } from "./nav-links";

type AppShellProps = {
  email: string;
  fullName?: string | null;
  role?: string | null;
  children: ReactNode;
};

export function AppShell({ email, fullName, role, children }: AppShellProps) {
  const displayName = fullName ?? email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <Link href="/maps" className="brand__link">
            <span className="brand__icon">◈</span>
            <span className="brand__text">Mindmap</span>
          </Link>
        </div>

        <div className="shell__nav-separator" />

        <nav className="shell__nav">
          <NavLinks />
        </nav>

        <div className="shell__nav-separator" />

        <div className="shell__profile">
          <Link href="/profile" className="shell__profile-link">
            <div className="shell__avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="shell__profile-info">
              <span className="shell__profile-name">{displayName}</span>
              {role && <span className="shell__profile-role">{role}</span>}
              <span className="shell__profile-email">{email}</span>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="shell__content">{children}</main>
    </div>
  );
}
