"use client";

import Link from "next/link";
import { useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  client_id: string | null;
};

type CalendarViewProps = {
  initialTasks: Task[];
  initialYear: number;
  initialMonth: number;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarView({ initialTasks, initialYear, initialMonth }: CalendarViewProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const tasksByDay: Record<number, Task[]> = {};

  for (const task of initialTasks) {
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

  return (
    <div className="calendar">
      <div className="calendar__nav">
        <button type="button" className="button button--secondary button--sm" onClick={prevMonth}>
          ‹
        </button>
        <h2 className="calendar__title">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button type="button" className="button button--secondary button--sm" onClick={nextMonth}>
          ›
        </button>
        <Link href="/projects" className="button button--secondary button--sm" style={{ marginLeft: "auto" }}>
          Kanban
        </Link>
      </div>

      <div className="calendar__grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar__weekday">{w}</div>
        ))}
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const dayTasks = day ? (tasksByDay[day] ?? []) : [];
          return (
            <div
              key={i}
              className={`calendar__cell${day ? "" : " calendar__cell--empty"}${isToday ? " calendar__cell--today" : ""}`}
            >
              {day && <span className="calendar__day-num">{day}</span>}
              {dayTasks.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className={`calendar__task calendar__task--${t.status}`}
                  title={t.title}
                >
                  {t.title.slice(0, 20)}{t.title.length > 20 ? "…" : ""}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <span className="calendar__more">+{dayTasks.length - 3} mais</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
