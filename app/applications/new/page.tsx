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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div>
          <h2 className="page-title">New Application</h2>
          <p className="page-subtitle">Create a new application record and return to your pipeline table.</p>
        </div>
        <Link href="/applications" className="tab-btn ghost">Back to Applications</Link>
      </div>

      <section className="card">
        <CardHeader title="Application Details" subtitle="Capture company, role, and status for tracking." />
        <form onSubmit={onSubmit} className="grid grid-2">
          <label>Company Name<input name="company_name" required /></label>
          <label>Role Title<input name="role_title" required /></label>
          <label style={{ gridColumn: "1 / -1" }}>Job Description<textarea name="job_description" rows={6} required /></label>
          <label>Date Applied<input type="date" name="date_applied" required /></label>
          <label>
            Status
            <select name="status" defaultValue="APPLIED">
              <option value="SAVED">Saved</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEWING">Interviewing</option>
              <option value="REJECTED">Rejected</option>
              <option value="OFFER">Offer</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>Notes<textarea name="notes" rows={4} /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Application"}</button>
            <Link href="/applications" className="tab-btn ghost">Cancel</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
