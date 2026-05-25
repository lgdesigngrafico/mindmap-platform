"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type MindMapRecord = Database["public"]["Tables"]["mind_maps"]["Row"];
type MindMapEdgeRecord = Database["public"]["Tables"]["edges"]["Row"];

type CreateEdgeInput = {
  mindMapId: string;
  sourceNodeId: string;
  targetNodeId: string;
};

type DeleteEdgeInput = {
  id: string;
};

async function ensureOwnedMap(mindMapId: string, userId: string): Promise<Pick<MindMapRecord, "id">> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id")
    .eq("id", mindMapId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Mapa não encontrado.");
  }

  return data;
}

async function getOwnedEdge(edgeId: string, userId: string): Promise<Pick<MindMapEdgeRecord, "id" | "mind_map_id">> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("edges")
    .select("id, mind_map_id")
    .eq("id", edgeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Aresta não encontrada.");
  }

  await ensureOwnedMap(data.mind_map_id, userId);
  return data;
}

export async function createEdge(input: CreateEdgeInput): Promise<MindMapEdgeRecord> {
  const user = await requireUser();
  await ensureOwnedMap(input.mindMapId, user.id);

  if (input.sourceNodeId === input.targetNodeId) {
    throw new Error("Não é permitido conectar um nó a ele mesmo.");
  }

  const supabase = (await createClient()) as any;
  const { data: existing } = await supabase
    .from("edges")
    .select("id, mind_map_id, source_node_id, target_node_id, label, edge_type, created_at")
    .eq("mind_map_id", input.mindMapId)
    .eq("source_node_id", input.sourceNodeId)
    .eq("target_node_id", input.targetNodeId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("edges")
    .insert({
      mind_map_id: input.mindMapId,
      source_node_id: input.sourceNodeId,
      target_node_id: input.targetNodeId
    })
    .select("id, mind_map_id, source_node_id, target_node_id, label, edge_type, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar aresta.");
  }

  revalidatePath(`/maps/${input.mindMapId}`);
  return data;
}

export async function deleteEdge(input: DeleteEdgeInput): Promise<{ id: string }> {
  const user = await requireUser();
  const edge = await getOwnedEdge(input.id, user.id);
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("edges")
    .delete()
    .eq("id", input.id)
    .eq("mind_map_id", edge.mind_map_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/maps/${edge.mind_map_id}`);
  return { id: input.id };
}