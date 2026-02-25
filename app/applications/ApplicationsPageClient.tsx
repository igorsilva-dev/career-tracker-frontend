"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { getMetrics, listApplications } from "@/lib/api/applications";
import { Application, ApplicationStatus, DashboardMetrics } from "@/lib/types";

function inferMatchFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/(?:match|score)\s*[:=]\s*(\d{1,3})\s*%?/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function matchClass(value: number | null): string {
  if (value == null) return "match-value neutral";
  if (value >= 80) return "match-value high";
  if (value >= 60) return "match-value medium";
  return "match-value low";
}

export default function ApplicationsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedFromUrl = useRef(false);

  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");
  const [sortBy, setSortBy] = useState<"company" | "role" | "status" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  async function load() {
    setLoading(true);
    try {
      const [applications, metricsResult] = await Promise.all([
        listApplications(),
        getMetrics().catch(() => null),
      ]);
      setItems(applications);
      setMetrics(metricsResult);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const text = searchParams.get("text");
    const createdFrom = searchParams.get("created_from");
    const createdTo = searchParams.get("created_to");
    const sortByParam = searchParams.get("sort_by");
    const sortOrderParam = searchParams.get("sort_order");
    const advanced = searchParams.get("advanced");

    const validStatus: Array<ApplicationStatus | "ALL"> = ["ALL", "SAVED", "APPLIED", "INTERVIEWING", "REJECTED", "OFFER"];
    const validSortBy = ["company", "role", "status", "date"];
    const validSortOrder = ["asc", "desc"];

    setStatusFilter(validStatus.includes((status ?? "ALL") as ApplicationStatus | "ALL") ? ((status ?? "ALL") as ApplicationStatus | "ALL") : "ALL");
    setSearchFilter(text ?? "");
    setCreatedFromFilter(createdFrom ?? "");
    setCreatedToFilter(createdTo ?? "");
    setSortBy(validSortBy.includes(sortByParam ?? "") ? (sortByParam as "company" | "role" | "status" | "date") : "date");
    setSortOrder(validSortOrder.includes(sortOrderParam ?? "") ? (sortOrderParam as "asc" | "desc") : "desc");
    setShowAdvancedFilters(advanced === "1");

    initializedFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromUrl.current) {
      return;
    }

    const params = new URLSearchParams();

    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (searchFilter.trim()) params.set("text", searchFilter.trim());
    if (createdFromFilter) params.set("created_from", createdFromFilter);
    if (createdToFilter) params.set("created_to", createdToFilter);
    if (sortBy !== "date") params.set("sort_by", sortBy);
    if (sortOrder !== "desc") params.set("sort_order", sortOrder);
    if (showAdvancedFilters) params.set("advanced", "1");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    pathname,
    router,
    statusFilter,
    searchFilter,
    createdFromFilter,
    createdToFilter,
    sortBy,
    sortOrder,
    showAdvancedFilters,
  ]);

  function toggleSort(field: "company" | "role" | "status" | "date") {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortOrder("asc");
  }

  const localMetrics = useMemo(() => {
    const countByStatus: Record<ApplicationStatus, number> = {
      SAVED: 0,
      APPLIED: 0,
      INTERVIEWING: 0,
      REJECTED: 0,
      OFFER: 0,
    };

    for (const item of items) {
      countByStatus[item.status] += 1;
    }

    const total = items.length;
    const interviews = countByStatus.INTERVIEWING;
    const interviewRate = total ? Math.round((interviews / total) * 100) : 0;

    return {
      total_applications: total,
      active_interviews: interviews,
      rejections: countByStatus.REJECTED,
      offers: countByStatus.OFFER,
      interview_rate: interviewRate,
    };
  }, [items]);

  const summary = metrics ?? localMetrics;
  const hasAdvancedFilters = Boolean(createdFromFilter || createdToFilter);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (searchFilter.trim()) {
      const text = searchFilter.toLowerCase();
      result = result.filter(
        (item) =>
          item.company_name.toLowerCase().includes(text) ||
          item.role_title.toLowerCase().includes(text) ||
          item.job_description.toLowerCase().includes(text)
      );
    }

    if (createdFromFilter) {
      result = result.filter((item) => item.date_applied >= createdFromFilter);
    }

    if (createdToFilter) {
      result = result.filter((item) => item.date_applied <= createdToFilter);
    }

    result.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "company") return a.company_name.localeCompare(b.company_name) * order;
      if (sortBy === "role") return a.role_title.localeCompare(b.role_title) * order;
      if (sortBy === "status") return a.status.localeCompare(b.status) * order;
      return a.date_applied.localeCompare(b.date_applied) * order;
    });

    return result;
  }, [items, statusFilter, searchFilter, createdFromFilter, createdToFilter, sortBy, sortOrder]);

  function resetAdvancedFilters() {
    setCreatedFromFilter("");
    setCreatedToFilter("");
  }

  return (
    <div>
      <div className="applications-head applications-head-tight">
        <div>
          <h2 className="page-title">Applications</h2>
          <p className="page-subtitle">Track your application pipeline and conversion signals.</p>
        </div>
        <Link href="/applications/new" className="primary-link-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Application
        </Link>
      </div>

      <section className="applications-kpis">
        <article className="mini-kpi-card">
          <div className="mini-kpi-head">
            <span className="mini-kpi-icon orange" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="7" width="16" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 114 0v2M12 7V5a2 2 0 114 0v2" />
              </svg>
            </span>
            <span className="mini-kpi-label">Total Applications</span>
          </div>
          <strong className="mini-kpi-value">{summary.total_applications}</strong>
        </article>
        <article className="mini-kpi-card">
          <div className="mini-kpi-head">
            <span className="mini-kpi-icon amber" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16l5-5 4 4 7-7" />
                <path d="M14 8h6v6" />
              </svg>
            </span>
            <span className="mini-kpi-label">Active Interviews</span>
          </div>
          <strong className="mini-kpi-value">{summary.active_interviews}</strong>
        </article>
        <article className="mini-kpi-card">
          <div className="mini-kpi-head">
            <span className="mini-kpi-icon red" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </span>
            <span className="mini-kpi-label">Rejections</span>
          </div>
          <strong className="mini-kpi-value">{summary.rejections}</strong>
        </article>
        <article className="mini-kpi-card">
          <div className="mini-kpi-head">
            <span className="mini-kpi-icon green" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
                <path d="M8.5 12.5l2.4 2.4 4.6-4.8" />
              </svg>
            </span>
            <span className="mini-kpi-label">Offers</span>
          </div>
          <strong className="mini-kpi-value">{summary.offers}</strong>
        </article>
        <article className="mini-kpi-card">
          <div className="mini-kpi-head">
            <span className="mini-kpi-icon orange" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
            </span>
            <span className="mini-kpi-label">Interview Rate</span>
          </div>
          <strong className="mini-kpi-value">{summary.interview_rate}%</strong>
        </article>
      </section>

      <section className="applications-panel">
        <div className="applications-panel-head applications-panel-head-split">
          <h3>Recent Applications</h3>
          <button type="button" className="tab-btn ghost panel-ghost-btn" onClick={() => setShowFilters((prev) => !prev)}>
            {showFilters ? "Hide filters" : "Filters"}
          </button>
        </div>

        {showFilters ? (
          <>
            <div className="applications-toolbar">
              <div className="search-wrap">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search company, role, or description..."
                />
              </div>

              <div className="control-shell select-shell compact-control">
                <select
                  className="select-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "ALL")}
                >
                  <option value="ALL">All statuses</option>
                  <option value="SAVED">Saved</option>
                  <option value="APPLIED">Applied</option>
                  <option value="INTERVIEWING">Interviewing</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="OFFER">Offer</option>
                </select>
                <span className="control-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>

              <button type="button" className="tab-btn ghost" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
                Advanced filters {hasAdvancedFilters ? "(active)" : ""}
              </button>
              {showAdvancedFilters ? (
                <button type="button" className="tab-btn ghost" onClick={resetAdvancedFilters} disabled={!hasAdvancedFilters}>
                  Reset
                </button>
              ) : null}
            </div>

            {showAdvancedFilters ? (
              <div className="advanced-grid advanced-filters-inline">
                <label className="field-label">
                  Created from
                  <div className="control-shell date-shell">
                    <input
                      type="date"
                      className="input-control date-control"
                      value={createdFromFilter}
                      onChange={(e) => setCreatedFromFilter(e.target.value)}
                    />
                    <span className="control-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 11h18" />
                      </svg>
                    </span>
                  </div>
                </label>
                <label className="field-label">
                  Created to
                  <div className="control-shell date-shell">
                    <input
                      type="date"
                      className="input-control date-control"
                      value={createdToFilter}
                      onChange={(e) => setCreatedToFilter(e.target.value)}
                    />
                    <span className="control-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 11h18" />
                      </svg>
                    </span>
                  </div>
                </label>
              </div>
            ) : null}
          </>
        ) : null}

        {loading ? <p className="muted">Loading...</p> : null}

        <div className="table-wrap">
          <table className="table applications-table">
            <thead>
              <tr>
                <th><button type="button" className="sort-btn plain-sort-btn" onClick={() => toggleSort("company")}>Company</button></th>
                <th><button type="button" className="sort-btn plain-sort-btn" onClick={() => toggleSort("role")}>Role</button></th>
                <th><button type="button" className="sort-btn plain-sort-btn" onClick={() => toggleSort("status")}>Status</button></th>
                <th><button type="button" className="sort-btn plain-sort-btn" onClick={() => toggleSort("date")}>Date Applied</button></th>
                <th>Match</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const match = inferMatchFromNotes(item.notes);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.company_name}</strong></td>
                    <td>{item.role_title}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{item.date_applied}</td>
                    <td><span className={matchClass(match)}>{match == null ? "—" : `${match}%`}</span></td>
                    <td>
                      <Link href={`/analysis?applicationId=${item.id}`} className="analyze-link">
                        Analyze
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredItems.length && !loading ? (
            <div className="table-empty-state">
              <div className="table-empty-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 3v8h8V3h-8zM3 21h8v-6H3v6z" />
                </svg>
              </div>
              <h4>{items.length === 0 ? "No applications yet" : "No results for current filters"}</h4>
              <p className="muted">
                {items.length === 0
                  ? "Use the New Application button at the top-right to create your first entry."
                  : "Try broadening your search or clearing filters to see more applications."}
              </p>
              <div className="table-empty-actions">
                {items.length === 0 ? null : (
                  <button
                    type="button"
                    className="tab-btn ghost"
                    onClick={() => {
                      setSearchFilter("");
                      setStatusFilter("ALL");
                      setShowAdvancedFilters(false);
                      resetAdvancedFilters();
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
