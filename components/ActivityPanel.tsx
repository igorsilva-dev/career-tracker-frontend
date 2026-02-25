interface ActivityItem {
  label: string;
  detail: string;
  tone: "neutral" | "good" | "warn";
}

interface ActivityPanelProps {
  interviewRate: number;
}

export function ActivityPanel({ interviewRate }: ActivityPanelProps) {
  const items: ActivityItem[] = [
    {
      label: "New application saved",
      detail: "Track role + status updates in Applications",
      tone: "neutral",
    },
    {
      label: "Match analysis completed",
      detail: "Use missing skills list to improve bullet relevance",
      tone: "good",
    },
    {
      label: "Tailored CV generated",
      detail: "Export final PDF and attach to application record",
      tone: "warn",
    },
  ];

  return (
    <aside className="card">
      <div className="card-header">
        <h3 className="card-title">Activity Feed</h3>
        <p className="card-subtitle">Recent pipeline actions and next recommendations.</p>
      </div>

      <div className="grid" style={{ gap: 10 }}>
        {items.map((item) => (
          <article className={`activity-item ${item.tone}`} key={item.label}>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, boxShadow: "none" }}>
        <p className="metric-label">Current Interview Readiness</p>
        <p className="metric-value" style={{ fontSize: "1.35rem", marginBottom: 0 }}>{interviewRate}%</p>
        <small className="muted">Based on active interview conversion.</small>
      </div>
    </aside>
  );
}
