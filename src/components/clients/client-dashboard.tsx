type ClientDashboardProps = {
  stats: {
    totalMaps: number;
    totalTasks: number;
    doneTasks: number;
    pendingTasks: number;
  };
  clientColor: string;
};

export function ClientDashboard({ stats, clientColor }: ClientDashboardProps) {
  const items = [
    { label: "Mapas Mentais", value: stats.totalMaps },
    { label: "Total de Tarefas", value: stats.totalTasks },
    { label: "Tarefas Concluídas", value: stats.doneTasks },
    { label: "Tarefas Pendentes", value: stats.pendingTasks }
  ];

  return (
    <div className="client-stats">
      {items.map((item) => (
        <div key={item.label} className="stat-card" style={{ borderTopColor: clientColor }}>
          <span className="stat-card__value">{item.value}</span>
          <span className="stat-card__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
