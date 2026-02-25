"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { CardHeader } from "@/components/ui/CardHeader";
import { analyzeMatch, generateCV } from "@/lib/api/analysis";
import { getMyProfile } from "@/lib/api/profile";
import { CVGenerateResponse, CandidateProfile } from "@/lib/types";

export default function CVGeneratorPage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [result, setResult] = useState<CVGenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setProfile(await getMyProfile());
      } catch {
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.normalized_cv_text) return;

    const form = new FormData(event.currentTarget);
    const job_description = String(form.get("job_description") || "");

    setLoading(true);
    try {
      const analysis = await analyzeMatch({ cv_text: profile.normalized_cv_text, job_description });
      const cv = await generateCV({
        application_id: Number(form.get("application_id") || 1),
        original_cv_text: profile.normalized_cv_text,
        job_description,
        analysis,
        template_id: String(form.get("template_id") || "classic") as "classic" | "modern" | "compact",
      });
      setResult(cv);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="page-title">Tailored CV Generator</h2>
      <p className="page-subtitle">Generate using your saved profile CV and role-specific context.</p>

      <div className="grid grid-2">
        <section className="card">
          <CardHeader title="Generate CV" subtitle="Pick a template and synthesize a role-specific version." />
          {profileLoading ? <p className="muted">Loading profile...</p> : null}
          {!profileLoading && !profile ? (
            <p className="muted">
              No profile CV found. <Link href="/profile" style={{ color: "#ff7a59" }}>Upload your CV in Profile</Link> first.
            </p>
          ) : null}
          {profile ? (
            <form onSubmit={onSubmit} className="grid">
              <label>Application ID<input name="application_id" type="number" defaultValue={1} required /></label>
              <label>Template
                <select name="template_id" defaultValue="classic">
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label>CV Source<textarea value={profile.source_filename ?? "Saved CV"} rows={2} readOnly /></label>
              <label>Job Description<textarea name="job_description" rows={10} required minLength={50} /></label>
              <button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Tailored CV"}</button>
            </form>
          ) : null}
        </section>

        <section className="card">
          <CardHeader title="Generated Result" subtitle="Preview the transformed content before downloading." />
          {!result ? <p className="muted">Complete the form to generate a tailored CV preview.</p> : null}
          {result ? (
            <div className="grid">
              <article className="list-item">
                <strong>Professional Summary</strong>
                <p>{result.professional_summary}</p>
              </article>

              <article className="list-item">
                <strong>Reordered Skills</strong>
                <p>{result.reordered_skills.join(", ")}</p>
              </article>

              <article className="list-item">
                <strong>Output Artifact</strong>
                <p>{result.generated_pdf_filename}</p>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
