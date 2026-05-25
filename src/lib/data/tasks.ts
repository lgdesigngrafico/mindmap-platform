"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export async function getTasks(userId: string, clientId?: string): Promise<TaskRow[]> {
  const supabase = (await createClient()) as any;
  let query = supabase
    .from("tasks")
    .select("id, user_id, client_id, mind_map_id, title, description, status, priority, due_date, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTasksByDate(
  userId: string,
  year: number,
  month: number
): Promise<TaskRow[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("tasks")
    .select("id, user_id, client_id, mind_map_id, title, description, status, priority, due_date, created_at, updated_at")
    .eq("user_id", userId)
    .gte("due_date", start)
    .lte("due_date", end)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getKanbanColumns(
  userId: string,
  clientId?: string
): Promise<{ todo: TaskRow[]; in_progress: TaskRow[]; done: TaskRow[] }> {
  const tasks = await getTasks(userId, clientId);
  return {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done")
  };
}
