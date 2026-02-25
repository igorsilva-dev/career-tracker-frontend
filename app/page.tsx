import { ActivityPanel } from "@/components/ActivityPanel";
import { StatCard } from "@/components/ui/StatCard";
import { getMetrics } from "@/lib/api/applications";

export default async function DashboardPage() {
  const metrics = await getMetrics().catch(() => ({
    total_applications: 0,
    active_interviews: 0,
    rejections: 0,
    offers: 0,
    interview_rate: 0,
  }));

  return (
    <section>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Live conversion health across your applications.</p>

      <div className="dashboard-main-grid">
        <div className="grid" style={{ gap: 16 }}>
          <div className="grid grid-3">
            <StatCard label="Total Applications" value={metrics.total_applications} />
            <StatCard label="Active Interviews" value={metrics.active_interviews} />
            <StatCard label="Interview Rate" value={`${metrics.interview_rate}%`} hint="Interviewing / total applications" />
            <StatCard label="Rejections" value={metrics.rejections} />
            <StatCard label="Offers" value={metrics.offers} />
          </div>

          <article className="card">
            <div className="card-header">
              <h3 className="card-title">Conversion Momentum</h3>
              <p className="card-subtitle">Track interview progression from your full pipeline.</p>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, metrics.interview_rate))}%` }} />
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Current interview conversion is <strong>{metrics.interview_rate}%</strong>.
            </p>
          </article>
        </div>

        <ActivityPanel interviewRate={metrics.interview_rate} />
      </div>
    </section>
  );
}
