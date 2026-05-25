"use client";

import { useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  client_id: string | null;
};

type ClientCalendarProps = {
  tasks: Task[];
  clientId: string;
  initialYear: number;
  initialMonth: number;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ClientCalendar({ tasks, clientId, initialYear, initialMonth }: ClientCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const clientTasks = tasks.filter((t) => t.client_id === clientId);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const tasksByDay: Record<number, Task[]> = {};

  for (const task of clientTasks) {
    if (!task.due_date) continue;
    const d = new Date(task.due_date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const selectedDayTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];

  const statusLabel: Record<string, string> = { todo: "A Fazer", in_progress: "Em Andamento", done: "Concluído" };
  const priorityLabel: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

  return (
    <div className="client-calendar">
      <div className="calendar__nav">
        <button type="button" className="button button--secondary button--sm" onClick={prevMonth}>
          ‹
        </button>
        <h3 className="calendar__title">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button type="button" className="button button--secondary button--sm" onClick={nextMonth}>
          ›
        </button>
      </div>

      <div className="calendar__grid calendar__grid--mini">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar__weekday">{w}</div>
        ))}
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const hasTasks = day ? (tasksByDay[day]?.length ?? 0) > 0 : false;
          const isSelected = day === selectedDay;
          return (
            <div
              key={i}
              className={`calendar__cell${day ? "" : " calendar__cell--empty"}${isToday ? " calendar__cell--today" : ""}${isSelected ? " calendar__cell--selected" : ""}`}
              onClick={() => day && setSelectedDay(isSelected ? null : day)}
              style={{ cursor: day ? "pointer" : undefined }}
            >
              {day && (
                <>
                  <span className="calendar__day-num">{day}</span>
                  {hasTasks && <span className="calendar__dot" />}
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="client-calendar__day-tasks">
          <h4 className="client-calendar__day-title">
            {selectedDay} de {MONTH_NAMES[month - 1]}
          </h4>
          {selectedDayTasks.length === 0 ? (
            <p className="text-muted">Nenhuma tarefa neste dia.</p>
          ) : (
            <ul className="task-list">
              {selectedDayTasks.map((t) => (
                <li key={t.id} className="task-list__item">
                  <span className="task-list__title">{t.title}</span>
                  <span className="task-list__status">{statusLabel[t.status]}</span>
                  <span className={`task-card__priority task-card__priority--${t.priority}`}>
                    {priorityLabel[t.priority]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
