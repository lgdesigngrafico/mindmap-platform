import { signOutAction } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton className="button button--ghost button--full" pendingLabel="Saindo...">
        Sair
      </SubmitButton>
    </form>
  );
}
