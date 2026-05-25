import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

type SignupPageProps = {
  searchParams: {
    error?: string;
  };
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/maps");
  }

  return (
    <main className="auth-page">
      <SignupForm error={searchParams.error} />
    </main>
  );
}
