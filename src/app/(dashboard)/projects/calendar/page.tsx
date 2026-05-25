import { requireUser } from "@/lib/auth/session";
import { getTasks } from "@/lib/data/tasks";
import { CalendarView } from "@/components/projects/calendar-view";

export default async function CalendarPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = await getTasks(user.id);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Calendário</h1>
        <p>Visualize tarefas por data de entrega.</p>
      </header>
      <CalendarView
        initialTasks={tasks}
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth() + 1}
      />
    </div>
  );
}
