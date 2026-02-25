"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { CardHeader } from "@/components/ui/CardHeader";
import { analyzeMatch } from "@/lib/api/analysis";
import { getMyProfile } from "@/lib/api/profile";
import { CandidateProfile, MatchAnalysisResponse } from "@/lib/types";

export default function AnalysisPage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [result, setResult] = useState<MatchAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

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
    setLoading(true);
    try {
      const response = await analyzeMatch({
        cv_text: profile.normalized_cv_text,
        job_description: String(form.get("job_description") || ""),
      });
      setResult(response);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="page-title">AI Match Analysis</h2>
      <p className="page-subtitle">Analyze using your saved profile CV and the target job description.</p>

      <div className="grid grid-2">
        <section className="card">
          <CardHeader title="Run Analysis" subtitle="CV source is your uploaded profile." />
          {profileLoading ? <p className="muted">Loading profile...</p> : null}
          {!profileLoading && !profile ? (
            <p className="muted">
              No profile CV found. <Link href="/profile" style={{ color: "#ff7a59" }}>Upload your CV in Profile</Link> first.
            </p>
          ) : null}
          {profile ? (
            <form onSubmit={onSubmit} className="grid">
              <label>CV Source<textarea value={profile.source_filename ?? "Saved CV"} rows={2} readOnly /></label>
              <label>Job Description<textarea name="job_description" rows={10} required minLength={50} /></label>
              <button type="submit" disabled={loading}>{loading ? "Analyzing..." : "Analyze Match"}</button>
            </form>
          ) : null}
        </section>

        <section className="card">
          <CardHeader title="Structured Output" subtitle="Match score, gap breakdown, and bullet-level improvements." />
          {!result ? <p className="muted">Run the analysis to view score, gaps, and rewritten bullets.</p> : null}
          {result ? (
            <div className="grid">
              <article className="list-item">
                <strong>Overall Match</strong>
                <p className="metric-value" style={{ margin: "8px 0 0", fontSize: "1.4rem" }}>{result.match_score.overall_match_percentage}%</p>
                <small>Seniority: {result.match_score.seniority_alignment}</small>
              </article>
              <article className="list-item">
                <strong>Skill Overlap</strong>
                <p>{result.match_score.skill_overlap.join(", ") || "None"}</p>
                <strong>Missing Critical Skills</strong>
                <p>{result.match_score.missing_critical_skills.join(", ") || "None"}</p>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
