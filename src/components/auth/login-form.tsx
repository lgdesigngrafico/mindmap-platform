import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/ui/submit-button";

type LoginFormProps = {
  error?: string;
  message?: string;
};

export function LoginForm({ error, message }: LoginFormProps) {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse seus mapas mentais com email e senha."
      footer={
        <p>
          Ainda não tem conta? <Link href="/signup">Criar conta</Link>
        </p>
      }
    >
      <form action={loginAction} className="stack">
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="voce@email.com" required />
        </label>
        <label className="field">
          <span>Senha</span>
          <input name="password" type="password" placeholder="Sua senha" required minLength={6} />
        </label>
        {error ? <p className="message message--error">{error}</p> : null}
        {message ? <p className="message message--success">{message}</p> : null}
        <SubmitButton className="button button--primary button--full" pendingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>
      <div className="separator">
        <span>ou</span>
      </div>
      <GoogleSignInButton />
    </AuthCard>
  );
}
