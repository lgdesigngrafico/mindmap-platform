"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type MindMapNodeRecord = Database["public"]["Tables"]["nodes"]["Row"];
type MindMapRecord = Database["public"]["Tables"]["mind_maps"]["Row"];

type CreateNodeInput = {
  mindMapId: string;
  parentNodeId?: string | null;
  label?: string;
  subtitle?: string | null;
  notes?: string | null;
  image_suggestion?: string | null;
  position?: {
    x: number;
    y: number;
  };
  sortOrder?: number;
  setAsRoot?: boolean;
};

type UpdateNodeInput = {
  id: string;
  label?: string;
  subtitle?: string | null;
  notes?: string | null;
  image_suggestion?: string | null;
};

type UpdateNodePositionInput = {
  id: string;
  position: {
    x: number;
    y: number;
  };
};

type DeleteNodeInput = {
  id: string;
};

async function ensureOwnedMap(mindMapId: string, userId: string): Promise<Pick<MindMapRecord, "id" | "root_node_id">> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, root_node_id")
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

async function getNodeOwnership(nodeId: string, userId: string): Promise<Pick<MindMapNodeRecord, "id" | "mind_map_id">> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("nodes")
    .select("id, mind_map_id")
    .eq("id", nodeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nó não encontrado.");
  }

  await ensureOwnedMap(data.mind_map_id, userId);
  return data;
}

export async function createNode(input: CreateNodeInput): Promise<MindMapNodeRecord> {
  const user = await requireUser();
  await ensureOwnedMap(input.mindMapId, user.id);

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("nodes")
    .insert({
      mind_map_id: input.mindMapId,
      parent_node_id: input.parentNodeId ?? null,
      label: input.label?.trim() || "Novo nó",
      subtitle: input.subtitle ?? null,
      notes: input.notes ?? null,
      image_suggestion: input.image_suggestion ?? null,
      pos_x: input.position?.x ?? 0,
      pos_y: input.position?.y ?? 0,
      sort_order: input.sortOrder ?? 0
    })
    .select("id, mind_map_id, parent_node_id, label, subtitle, notes, image_suggestion, pos_x, pos_y, color, width, height, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar nó.");
  }

  if (input.setAsRoot) {
    const { error: updateError } = await supabase
      .from("mind_maps")
      .update({
        root_node_id: data.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.mindMapId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath(`/maps/${input.mindMapId}`);
  return data;
}

export async function updateNode(input: UpdateNodeInput): Promise<MindMapNodeRecord> {
  const user = await requireUser();
  const ownedNode = await getNodeOwnership(input.id, user.id);
  const supabase = (await createClient()) as any;

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) updatePayload.label = input.label.trim() || "Novo nó";
  if (input.subtitle !== undefined) updatePayload.subtitle = input.subtitle;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.image_suggestion !== undefined) updatePayload.image_suggestion = input.image_suggestion;

  const { data, error } = await supabase
    .from("nodes")
    .update(updatePayload)
    .eq("id", input.id)
    .eq("mind_map_id", ownedNode.mind_map_id)
    .select("id, mind_map_id, parent_node_id, label, subtitle, notes, image_suggestion, pos_x, pos_y, color, width, height, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao atualizar nó.");
  }

  return data;
}

export async function updateNodePosition(input: UpdateNodePositionInput): Promise<MindMapNodeRecord> {
  const user = await requireUser();
  const ownedNode = await getNodeOwnership(input.id, user.id);
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("nodes")
    .update({
      pos_x: input.position.x,
      pos_y: input.position.y,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.id)
    .eq("mind_map_id", ownedNode.mind_map_id)
    .select("id, mind_map_id, parent_node_id, label, subtitle, notes, image_suggestion, pos_x, pos_y, color, width, height, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao persistir posição.");
  }

  return data;
}

export async function deleteNode(input: DeleteNodeInput) {
  const user = await requireUser();
  const ownedNode = await getNodeOwnership(input.id, user.id);
  const supabase = (await createClient()) as any;

  const { error } = await supabase
    .from("nodes")
    .delete()
    .eq("id", input.id)
    .eq("mind_map_id", ownedNode.mind_map_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/maps/${ownedNode.mind_map_id}`);
  return { id: input.id };
}