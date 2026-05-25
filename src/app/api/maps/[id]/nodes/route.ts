import { requireUser } from "@/lib/auth/session";
import { getNodesByMindMapId } from "@/lib/data/nodes";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const supabase = (await createClient()) as any;

    // Verify ownership
    const { data: map } = await supabase
      .from("mind_maps")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!map) {
      return Response.json({ error: "Mapa não encontrado." }, { status: 404 });
    }

    const nodes = await getNodesByMindMapId(params.id);
    return Response.json({ nodes });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar nós." },
      { status: 500 }
    );
  }
}
