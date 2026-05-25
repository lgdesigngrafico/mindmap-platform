"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

export async function getClients(userId: string): Promise<ClientRow[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("clients")
    .select("id, user_id, name, company, email, phone, notes, color, created_at, updated_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClientById(id: string, userId: string): Promise<ClientRow | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("clients")
    .select("id, user_id, name, company, email, phone, notes, color, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getClientStats(
  clientId: string,
  userId: string
): Promise<{ totalMaps: number; totalTasks: number; doneTasks: number; pendingTasks: number }> {
  const supabase = (await createClient()) as any;

  const [{ count: totalMaps }, { data: tasks }] = await Promise.all([
    supabase
      .from("mind_maps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("client_id", clientId),
    supabase
      .from("tasks")
      .select("status")
      .eq("user_id", userId)
      .eq("client_id", clientId)
  ]);

  const taskList = (tasks ?? []) as { status: string }[];
  const doneTasks = taskList.filter((t) => t.status === "done").length;

  return {
    totalMaps: totalMaps ?? 0,
    totalTasks: taskList.length,
    doneTasks,
    pendingTasks: taskList.length - doneTasks
  };
}
