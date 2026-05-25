import { exportMapToTasksAction } from "@/lib/actions/tasks";

export async function POST(req: Request) {
  try {
    const { mindMapId, clientId } = await req.json() as {
      mindMapId: string;
      clientId?: string;
    };

    if (!mindMapId) {
      return Response.json({ error: "mindMapId é obrigatório." }, { status: 400 });
    }

    await exportMapToTasksAction(mindMapId, clientId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro ao exportar." },
      { status: 500 }
    );
  }
}
