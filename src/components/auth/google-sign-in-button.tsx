"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GoogleSignInButtonProps = {
  nextPath?: string;
};

export function GoogleSignInButton({ nextPath = "/maps" }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (error) {
      setLoading(false);
      window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
    }
  }

  return (
    <button className="button button--secondary button--full" type="button" onClick={handleClick} disabled={loading}>
      {loading ? "Redirecionando..." : "Continuar com Google"}
    </button>
  );
}
