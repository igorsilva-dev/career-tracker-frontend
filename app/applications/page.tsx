"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CardHeader } from "@/components/ui/CardHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listApplications } from "@/lib/api/applications";
import { Application, ApplicationStatus } from "@/lib/types";

export default function ApplicationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedFromUrl = useRef(false);

  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");
  const [sortBy, setSortBy] = useState<"company" | "role" | "status" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  async function load() {
    setLoading(true);
    try {
      setItems(await listApplications());
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

  const counts = useMemo(() => {
    const base: Record<ApplicationStatus, number> = {
      SAVED: 0,
      APPLIED: 0,
      INTERVIEWING: 0,
      REJECTED: 0,
      OFFER: 0,
    };
    for (const item of items) {
      base[item.status] += 1;
    }
    return base;
  }, [items]);

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
      <h2 className="page-title">Application Tracker</h2>
      <p className="page-subtitle">Track your pipeline with a table-first workflow.</p>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <CardHeader title="My Applications" subtitle="Applications you create are visible only to you." />
          <Link href="/applications/new" className="tab-btn active">New Application</Link>
        </div>

        {loading ? <p className="muted">Loading...</p> : null}

        <div className="filters-wrap">
          <div className="status-tabs">
            <button type="button" className={`tab-btn ${statusFilter === "ALL" ? "active" : ""}`} onClick={() => setStatusFilter("ALL")}>All ({items.length})</button>
            <button type="button" className={`tab-btn ${statusFilter === "SAVED" ? "active" : ""}`} onClick={() => setStatusFilter("SAVED")}>Saved ({counts.SAVED})</button>
            <button type="button" className={`tab-btn ${statusFilter === "APPLIED" ? "active" : ""}`} onClick={() => setStatusFilter("APPLIED")}>Applied ({counts.APPLIED})</button>
            <button type="button" className={`tab-btn ${statusFilter === "INTERVIEWING" ? "active" : ""}`} onClick={() => setStatusFilter("INTERVIEWING")}>Interviewing ({counts.INTERVIEWING})</button>
            <button type="button" className={`tab-btn ${statusFilter === "REJECTED" ? "active" : ""}`} onClick={() => setStatusFilter("REJECTED")}>Rejected ({counts.REJECTED})</button>
            <button type="button" className={`tab-btn ${statusFilter === "OFFER" ? "active" : ""}`} onClick={() => setStatusFilter("OFFER")}>Offer ({counts.OFFER})</button>
          </div>

          <div className="search-wrap">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search company, role, or job description..."
            />
          </div>

          <div className="filters-row">
            <button type="button" className="tab-btn ghost" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
              Advanced filters {hasAdvancedFilters ? "(active)" : ""}
            </button>
            {showAdvancedFilters ? (
              <button type="button" className="tab-btn ghost" onClick={resetAdvancedFilters} disabled={!hasAdvancedFilters}>
                Reset filters
              </button>
            ) : null}
          </div>

          {showAdvancedFilters ? (
            <div className="advanced-grid">
              <label>
                Created from
                <input type="date" value={createdFromFilter} onChange={(e) => setCreatedFromFilter(e.target.value)} />
              </label>
              <label>
                Created to
                <input type="date" value={createdToFilter} onChange={(e) => setCreatedToFilter(e.target.value)} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th><button type="button" className="sort-btn" onClick={() => toggleSort("company")}>Company</button></th>
                <th><button type="button" className="sort-btn" onClick={() => toggleSort("role")}>Role</button></th>
                <th><button type="button" className="sort-btn" onClick={() => toggleSort("status")}>Status</button></th>
                <th><button type="button" className="sort-btn" onClick={() => toggleSort("date")}>Applied</button></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.company_name}</strong></td>
                  <td>{item.role_title}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.date_applied}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredItems.length && !loading ? <p className="muted">No applications match current filters.</p> : null}
          {!!filteredItems.length && !loading ? (
            <p className="muted" style={{ marginTop: 10 }}>Showing {filteredItems.length} of {items.length} applications.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
