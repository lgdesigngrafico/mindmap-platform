import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as { mindMapId: string; client_id: string | null };
    const { mindMapId, client_id } = body;

    if (!mindMapId) {
      return Response.json({ error: "mindMapId é obrigatório." }, { status: 400 });
    }

    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from("mind_maps")
      .update({ client_id, updated_at: new Date().toISOString() })
      .eq("id", mindMapId)
      .eq("user_id", user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return Response.json({ error: message }, { status: 500 });
  }
}
