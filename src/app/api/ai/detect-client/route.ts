import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as { prompt: string };
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ client_id: null }, { status: 200 });
    }

    const supabase = (await createClient()) as any;
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id);

    if (!clients || clients.length === 0) {
      return Response.json({ client_id: null });
    }

    const lowerPrompt = prompt.toLowerCase();
    const matched = (clients as { id: string; name: string }[]).find((c) =>
      lowerPrompt.includes(c.name.toLowerCase())
    );

    return Response.json({ client_id: matched?.id ?? null });
  } catch {
    return Response.json({ client_id: null });
  }
}
