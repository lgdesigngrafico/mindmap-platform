import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { createNode } from "@/lib/actions/nodes";
import { createEdge } from "@/lib/actions/edges";
import { computeTreeLayout } from "@/lib/mindmap/auto-layout";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as {
      nodes: { id: string; label: string; parentId: string | null; subtitle?: string; notes?: string; image_suggestion?: string }[];
      title?: string;
      prompt?: string;
      client_id?: string | null;
    };

    const { nodes: aiNodes, title, prompt, client_id: bodyClientId } = body;
    if (!Array.isArray(aiNodes) || aiNodes.length === 0) {
      return Response.json({ error: "Nós inválidos." }, { status: 400 });
    }

    const supabase = (await createClient()) as any;
    const mapTitle = title?.trim().slice(0, 80) || "Mapa do Chat IA";

    // Detect client from prompt if not already provided
    let resolvedClientId: string | null = bodyClientId ?? null;
    if (!resolvedClientId && prompt) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id);

      if (clients && clients.length > 0) {
        const lowerPrompt = prompt.toLowerCase();
        const matched = (clients as { id: string; name: string }[]).find((c) =>
          lowerPrompt.includes(c.name.toLowerCase())
        );
        resolvedClientId = matched?.id ?? null;
      }
    }

    const { data: mapData, error: mapError } = await supabase
      .from("mind_maps")
      .insert({ user_id: user.id, title: mapTitle, client_id: resolvedClientId })
      .select("id")
      .single();

    if (mapError || !mapData) {
      return Response.json({ error: mapError?.message ?? "Falha ao criar mapa." }, { status: 500 });
    }

    const mindMapId = mapData.id as string;
    const positioned = computeTreeLayout(aiNodes);

    // topological sort
    const sorted: typeof aiNodes = [];
    const remaining = [...aiNodes];
    const roots = remaining.filter((n) => n.parentId === null);
    sorted.push(...roots);
    for (const r of roots) remaining.splice(remaining.indexOf(r), 1);
    let safetyLimit = aiNodes.length * 2;
    while (remaining.length > 0 && safetyLimit-- > 0) {
      const processable = remaining.filter((n) => sorted.some((s) => s.id === n.parentId));
      if (processable.length === 0) break;
      for (const node of processable) {
        sorted.push(node);
        remaining.splice(remaining.indexOf(node), 1);
      }
    }
    sorted.push(...remaining);

    const idMap = new Map<string, string>();
    let firstRoot = true;

    for (let i = 0; i < sorted.length; i++) {
      const aiNode = sorted[i];
      const pos = positioned.find((p) => p.id === aiNode.id) ?? { x: i * 250, y: 0 };
      const realParentId = aiNode.parentId ? (idMap.get(aiNode.parentId) ?? null) : null;
      const isRoot = aiNode.parentId === null && firstRoot;
      if (isRoot) firstRoot = false;

      const created = await createNode({
        mindMapId,
        parentNodeId: realParentId,
        label: aiNode.label,
        subtitle: aiNode.subtitle ?? null,
        notes: aiNode.notes ?? null,
        image_suggestion: aiNode.image_suggestion ?? null,
        position: { x: pos.x, y: pos.y },
        sortOrder: i + 1,
        setAsRoot: isRoot
      });

      idMap.set(aiNode.id, created.id);
    }

    for (const aiNode of sorted) {
      if (!aiNode.parentId) continue;
      const sourceId = idMap.get(aiNode.parentId);
      const targetId = idMap.get(aiNode.id);
      if (!sourceId || !targetId) continue;
      await createEdge({ mindMapId, sourceNodeId: sourceId, targetNodeId: targetId });
    }

    return Response.json({ mapId: mindMapId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return Response.json({ error: message }, { status: 500 });
  }
}
