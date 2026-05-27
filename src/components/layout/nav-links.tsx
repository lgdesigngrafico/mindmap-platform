"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/maps", label: "Meus Mapas", icon: "◎" },
  { href: "/chat", label: "Chat IA", icon: "✦" },
  { href: "/projects", label: "Gestão", icon: "⊞" },
  { href: "/clients", label: "Clientes", icon: "◈" }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map(({ href, label, icon }) => {
        const isActive =
          href === "/maps" ? pathname === href || pathname.startsWith("/maps/") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`shell__nav-link${isActive ? " shell__nav-link--active" : ""}`}
          >
            <span className="shell__nav-icon">{icon}</span>
            <span className="shell__nav-label">{label}</span>
          </Link>
        );
      })}
    </>
  );
}
