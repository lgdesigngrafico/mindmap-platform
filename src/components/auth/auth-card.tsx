import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card">
      <header className="auth-card__header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="auth-card__body">{children}</div>
      <footer className="auth-card__footer">{footer}</footer>
    </section>
  );
}
