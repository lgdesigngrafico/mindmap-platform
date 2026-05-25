import { MapCreateForm } from "@/components/maps/map-create-form";
import { MapList } from "@/components/maps/map-list";
import { requireUser } from "@/lib/auth/session";
import { getMindMapsForUser } from "@/lib/data/mind-maps";

type MapsPageProps = {
  searchParams: {
    error?: string;
    message?: string;
  };
};

export default async function MapsPage({ searchParams }: MapsPageProps) {
  const user = await requireUser();
  const maps = await getMindMapsForUser(user.id);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Meus mapas mentais</h1>
        <p>Crie, acesse e gerencie seus mapas em um ambiente protegido por autenticação.</p>
      </header>
      {searchParams.error ? <p className="message message--error">{searchParams.error}</p> : null}
      {searchParams.message ? <p className="message message--success">{searchParams.message}</p> : null}
      <div className="page-grid">
        <MapCreateForm />
        <MapList maps={maps} />
      </div>
    </div>
  );
}
