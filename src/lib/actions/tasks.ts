"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getNodesByMindMapId } from "@/lib/data/nodes";
import type { Database } from "@/types/database";

type NodeRow = {
  id: string;
  label: string;
  notes: string | null;
  [key: string]: unknown;
};

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export async function createTaskAction(data: {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  due_date?: string;
  client_id?: string;
  mind_map_id?: string;
}): Promise<string> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      due_date: data.due_date || null,
      client_id: data.client_id || null,
      mind_map_id: data.mind_map_id || null
    } satisfies TaskInsert)
    .select("id")
    .single();

  if (error || !task) throw new Error(error?.message ?? "Falha ao criar tarefa.");

  revalidatePath("/projects");
  return task.id as string;
}

export async function updateTaskAction(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string;
    client_id: string;
  }>
): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const update: TaskUpdate = {
    updated_at: new Date().toISOString()
  };
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.description !== undefined) update.description = data.description || null;
  if (data.status !== undefined) update.status = data.status;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.due_date !== undefined) update.due_date = data.due_date || null;
  if (data.client_id !== undefined) update.client_id = data.client_id || null;

  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function updateTaskStatusAction(
  id: string,
  status: "todo" | "in_progress" | "done"
): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function deleteTaskAction(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function exportMapToTasksAction(
  mindMapId: string,
  clientId?: string
): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  // Get mind map title
  const { data: mapData } = await supabase
    .from("mind_maps")
    .select("title")
    .eq("id", mindMapId)
    .eq("user_id", user.id)
    .maybeSingle();

  const mapTitle = (mapData?.title as string | null) ?? "Mapa sem título";

  const nodes = await getNodesByMindMapId(mindMapId);

  // Build organized description from nodes structure
  // Identify slide parent nodes (children of root) and their 4 sub-nodes
  const rootNode = nodes.find((n: NodeRow) => !n.parent_node_id);
  const slideNodes = rootNode ? nodes.filter((n: NodeRow) => n.parent_node_id === rootNode.id) : [];

  let description = `## ${mapTitle}\n\n`;

  if (slideNodes.length > 0) {
    for (const slide of slideNodes) {
      description += `### ${slide.label}\n\n`;
      const children = nodes.filter((n: NodeRow) => n.parent_node_id === slide.id);
      for (const child of children) {
        description += `**${child.label}**\n${child.notes ?? ""}\n\n`;
      }
    }
  } else {
    // Fallback: list all nodes
    for (const node of nodes) {
      if (node.label) {
        description += `**${node.label}**\n${node.notes ?? ""}\n\n`;
      }
    }
  }

  await createTaskAction({
    title: mapTitle,
    description: description.trim(),
    status: "todo",
    priority: "medium",
    mind_map_id: mindMapId,
    client_id: clientId
  });

  revalidatePath("/projects");
}
