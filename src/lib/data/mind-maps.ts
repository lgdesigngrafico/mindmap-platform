import { createClient } from "@/lib/supabase/server";
import { getNodesByMindMapId } from "@/lib/data/nodes";
import { getEdgesByMindMapId } from "@/lib/data/edges";
import { createNode } from "@/lib/actions/nodes";
import type { Database } from "@/types/database";

type MindMapRecord = Database["public"]["Tables"]["mind_maps"]["Row"];
type MindMapGraphResult = {
  map: MindMapRecord;
  nodes: Awaited<ReturnType<typeof getNodesByMindMapId>>;
  edges: Awaited<ReturnType<typeof getEdgesByMindMapId>>;
};

export async function getMindMapsForUser(userId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, description, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getMindMapById(id: string, userId: string): Promise<MindMapRecord | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, user_id, title, description, root_node_id, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getMindMapGraph(id: string, userId: string): Promise<MindMapGraphResult | null> {
  const map = await getMindMapById(id, userId);

  if (!map) {
    return null;
  }

  let nodes = await getNodesByMindMapId(id);

  if (!nodes.length) {
    const rootNode = await createNode({
      mindMapId: id,
      label: map.title,
      position: { x: 0, y: 0 },
      sortOrder: 0,
      setAsRoot: true
    });

    nodes = [rootNode];
    map.root_node_id = rootNode.id;
  }

  const edges = await getEdgesByMindMapId(id);

  return {
    map,
    nodes,
    edges
  };
}
