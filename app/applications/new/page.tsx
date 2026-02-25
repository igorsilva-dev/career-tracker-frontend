"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { CardHeader } from "@/components/ui/CardHeader";
import { createApplication } from "@/lib/api/applications";

export default function NewApplicationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSaving(true);
    try {
      await createApplication({
        company_name: String(form.get("company_name") || ""),
        role_title: String(form.get("role_title") || ""),
        job_description: String(form.get("job_description") || ""),
        date_applied: String(form.get("date_applied") || ""),
        status: String(form.get("status") || "SAVED"),
        notes: String(form.get("notes") || ""),
      });
      router.push("/applications");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="new-app-header">
        <Link href="/applications" className="back-link-inline" aria-label="Back to applications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h2 className="page-title">New Application</h2>
          <p className="page-subtitle">Add a job application and analyze your CV match.</p>
        </div>
      </div>

      <section className="new-app-form-shell">
        <CardHeader title="Application Details" subtitle="Capture company, role, description, and current status." />
        <form onSubmit={onSubmit} className="grid grid-2 new-app-form-grid">
          <label>
            Company Name
            <input name="company_name" placeholder="e.g. CloudScale" required />
          </label>
          <label>
            Role Title
            <input name="role_title" placeholder="e.g. Senior SRE" required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Job Description
            <textarea name="job_description" rows={8} placeholder="Paste the full job description here..." required />
          </label>
          <label className="field-label">
            Date Applied
            <div className="control-shell date-shell">
              <input type="date" name="date_applied" className="input-control date-control" required />
              <span className="control-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
              </span>
            </div>
          </label>
          <label className="field-label">
            Status
            <div className="control-shell select-shell">
              <select name="status" defaultValue="APPLIED" className="select-control">
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
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Notes
            <textarea name="notes" rows={4} placeholder="Any additional context..." />
          </label>
          <div className="new-app-actions">
            <Link href="/applications" className="tab-btn ghost">Cancel</Link>
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Application"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
