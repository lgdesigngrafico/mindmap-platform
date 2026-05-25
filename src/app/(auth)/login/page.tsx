import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: {
    error?: string;
    message?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/maps");
  }

  return (
    <main className="auth-page">
      <LoginForm error={searchParams.error} message={searchParams.message} />
    </main>
  );
}
