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

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluído"
};

export function CalendarView({ initialTasks, initialYear, initialMonth }: CalendarViewProps) {
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

  // Tasks for selected day
  const selectedDayTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];
  const pending = selectedDayTasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const done = selectedDayTasks.filter((t) => t.status === "done");

  return (
    <div className="calendar-wrapper">
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
            const isSelected = day === selectedDay;
            const dayTasks = day ? (tasksByDay[day] ?? []) : [];
            return (
              <div
                key={i}
                className={`calendar__cell${day ? "" : " calendar__cell--empty"}${isToday ? " calendar__cell--today" : ""}${isSelected ? " calendar__cell--selected" : ""}`}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                style={day ? { cursor: "pointer" } : undefined}
              >
                {day && <span className="calendar__day-num">{day}</span>}
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`calendar__task calendar__task--${t.status}`}
                    title={`[${STATUS_LABELS[t.status]}] ${t.title}`}
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

      {selectedDay !== null && (
        <div className="calendar-day-detail">
          <div className="calendar-day-detail__header">
            <h3>
              {selectedDay} de {MONTH_NAMES[month - 1]}
              {selectedDayTasks.length === 0 && <span className="calendar-day-detail__empty"> — Nenhuma tarefa</span>}
            </h3>
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={() => setSelectedDay(null)}
            >
              ×
            </button>
          </div>

          {pending.length > 0 && (
            <div className="calendar-day-detail__group">
              <h4 className="calendar-day-detail__group-title calendar-day-detail__group-title--pending">
                Pendentes ({pending.length})
              </h4>
              <ul className="calendar-day-detail__list">
                {pending.map((t) => (
                  <li key={t.id} className={`calendar-day-detail__item calendar-day-detail__item--${t.status}`}>
                    <span className="calendar-day-detail__item-title">{t.title}</span>
                    <span className="calendar-day-detail__item-status">{STATUS_LABELS[t.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done.length > 0 && (
            <div className="calendar-day-detail__group">
              <h4 className="calendar-day-detail__group-title calendar-day-detail__group-title--done">
                Concluídas ({done.length})
              </h4>
              <ul className="calendar-day-detail__list">
                {done.map((t) => (
                  <li key={t.id} className="calendar-day-detail__item calendar-day-detail__item--done">
                    <span className="calendar-day-detail__item-title">{t.title}</span>
                    <span className="calendar-day-detail__item-status">{STATUS_LABELS[t.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
