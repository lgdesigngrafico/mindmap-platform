import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role_in_company")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Meu Perfil</h1>
        <p>Gerencie suas informações pessoais e função na empresa.</p>
      </header>
      <div className="profile-page">
        <ProfileForm
          initialFullName={data?.full_name ?? null}
          initialRoleInCompany={data?.role_in_company ?? null}
          email={user.email ?? ""}
        />
      </div>
    </div>
  );
}
