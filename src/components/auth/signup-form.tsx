import Link from "next/link";
import { signupAction } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/ui/submit-button";

type SignupFormProps = {
  error?: string;
};

export function SignupForm({ error }: SignupFormProps) {
  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para criar e organizar seus mapas mentais."
      footer={
        <p>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      }
    >
      <form action={signupAction} className="stack">
        <label className="field">
          <span>Nome</span>
          <input name="fullName" type="text" placeholder="Seu nome" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="voce@email.com" required />
        </label>
        <label className="field">
          <span>Senha</span>
          <input name="password" type="password" placeholder="Crie uma senha" required minLength={6} />
        </label>
        {error ? <p className="message message--error">{error}</p> : null}
        <SubmitButton className="button button--primary button--full" pendingLabel="Criando conta...">
          Criar conta
        </SubmitButton>
      </form>
      <div className="separator">
        <span>ou</span>
      </div>
      <GoogleSignInButton />
    </AuthCard>
  );
}
