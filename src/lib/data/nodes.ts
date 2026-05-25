import { createClient } from "@/lib/supabase/server";

export async function getNodesByMindMapId(mindMapId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("nodes")
    .select("id, mind_map_id, parent_node_id, label, notes, pos_x, pos_y, color, width, height, sort_order, created_at, updated_at")
    .eq("mind_map_id", mindMapId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}