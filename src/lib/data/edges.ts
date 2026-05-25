import { createClient } from "@/lib/supabase/server";

export async function getEdgesByMindMapId(mindMapId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("edges")
    .select("id, mind_map_id, source_node_id, target_node_id, label, edge_type, created_at")
    .eq("mind_map_id", mindMapId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}