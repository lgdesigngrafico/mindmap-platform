import { requireUser } from "@/lib/auth/session";
import { getClients } from "@/lib/data/clients";
import { ClientList } from "@/components/clients/client-list";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await getClients(user.id);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Clientes</h1>
        <p>Gerencie seus clientes e visualize tarefas e mapas associados.</p>
      </header>
      <ClientList initialClients={clients} />
    </div>
  );
}
