"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getApplication, getApplicationArtifacts, updateApplication } from "@/lib/api/applications";
import { Application, ApplicationArtifacts, ApplicationStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/ToastProvider";
import s from "./ApplicationDetailClient.module.css";

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SAVED", label: "Saved" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "OFFER", label: "Offer" },
];

const PIPELINE_STEPS: ApplicationStatus[] = ["SAVED", "APPLIED", "INTERVIEWING", "OFFER"];

function titleFromStatus(status: string): string {
  return status.toLowerCase().replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
}

function scoreTone(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function statusChipClass(status: ApplicationStatus): string {
  if (status === "INTERVIEWING") return "chip-interviewing";
  if (status === "OFFER") return "chip-offer";
  if (status === "REJECTED") return "chip-rejected";
  if (status === "APPLIED") return "chip-applied";
  return "chip-saved";
}

function StatusPipeline({ current }: { current: ApplicationStatus }) {
  if (current === "REJECTED") {
    return (
      <section className={s.card}>
        <div className={s.pipelineRejected}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
          <p>Application rejected</p>
        </div>
      </section>
    );
  }

  const idx = PIPELINE_STEPS.indexOf(current);
  return (
    <section className={s.card}>
      <div className={s.pipeline}>
        {PIPELINE_STEPS.map((step, i) => {
          const done = i <= idx;
          return (
            <div key={step} className={s.pipelineNodeWrap}>
              <div className={s.pipelineNode}>
                <span className={`${s.pipelineDot} ${done ? s.pipelineDone : ""}`}>
                  {done ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </span>
                <small>{titleFromStatus(step)}</small>
              </div>
              {i < PIPELINE_STEPS.length - 1 ? <div className={`${s.pipelineLine} ${i < idx ? s.pipelineLineDone : ""}`} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScorePreview({
  score,
  matchingCount,
  gapsCount,
  alignment,
  applicationId,
}: {
  score: number;
  matchingCount: number;
  gapsCount: number;
  alignment: string;
  applicationId: number;
}) {
  const tone = scoreTone(score);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const ringClass = tone === "high" ? s.ringHigh : tone === "medium" ? s.ringMedium : s.ringLow;

  return (
    <section className={s.card}>
      <div className={s.scoreHead}>
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 16l5-5 4 4 7-7" />
            <path d="M14 8h6v6" />
          </svg>
          Match Score
        </h3>
        <Link href={`/analysis?applicationId=${applicationId}`} className={s.inlineLink}>View full analysis</Link>
      </div>
      <div className={s.scoreBody}>
        <div className={s.scoreRing}>
          <svg viewBox="0 0 84 84" aria-hidden>
            <circle cx="42" cy="42" r={radius} className={s.ringTrack} strokeWidth="6" />
            <circle
              cx="42"
              cy="42"
              r={radius}
              className={ringClass}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <strong>{score}%</strong>
        </div>
        <div className={s.scoreStats}>
          <div>
            <span>Alignment</span>
            <em className={`${s.alignment} ${tone === "high" ? s.alignHigh : tone === "medium" ? s.alignMedium : s.alignLow}`}>
              {titleFromStatus(alignment)}
            </em>
          </div>
          <div>
            <span>Skills matched</span>
            <strong>{matchingCount}</strong>
          </div>
          <div>
            <span>Gaps found</span>
            <strong>{gapsCount}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ApplicationDetailClient() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params?.applicationId);
  const toast = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [draft, setDraft] = useState<Application | null>(null);
  const [artifacts, setArtifacts] = useState<ApplicationArtifacts>({ analyses: [], cv_versions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!applicationId || Number.isNaN(applicationId)) return;
    setLoading(true);
    setError(null);
    try {
      const [app, items] = await Promise.all([getApplication(applicationId), getApplicationArtifacts(applicationId)]);
      setApplication(app);
      setDraft(app);
      setArtifacts(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load application detail.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [applicationId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application || !draft) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateApplication(application.id, {
        company_name: draft.company_name,
        role_title: draft.role_title,
        job_description: draft.job_description,
        date_applied: draft.date_applied,
        status: draft.status,
        notes: draft.notes,
      });
      setApplication(updated);
      setDraft(updated);
      setEditing(false);
      toast.success("Application saved", "Your application details were updated successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update application.";
      setError(message);
      toast.error("Failed to save application", message);
    } finally {
      setSaving(false);
    }
  }

  const title = useMemo(() => {
    if (!application) return "Application";
    return `${application.company_name} · ${application.role_title}`;
  }, [application]);

  const latestAnalysis = artifacts.analyses[0] ?? null;

  if (!applicationId || Number.isNaN(applicationId)) return <p className="muted">Invalid application id.</p>;
  if (loading) return <p className="muted">Loading application...</p>;
  if (error && !application) return <p className="muted">{error}</p>;
  if (!draft) return <p className="muted">Application not found.</p>;

  return (
    <div className={s.root}>
      <div className={s.head}>
        <Link href="/applications" className={s.backBtn} aria-label="Back to applications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className={s.headMain}>
          <div>
            <h2 className="page-title">Application</h2>
            <p className="page-subtitle">{title}</p>
          </div>
          <span className={`chip ${statusChipClass(draft.status)}`}>{titleFromStatus(draft.status)}</span>
        </div>
      </div>

      {error ? <p className="muted">{error}</p> : null}

      <StatusPipeline current={draft.status} />

      {latestAnalysis ? (
        <ScorePreview
          score={latestAnalysis.overall_match_percentage}
          matchingCount={latestAnalysis.matching_skills_count}
          gapsCount={latestAnalysis.gaps_count}
          alignment={latestAnalysis.seniority_alignment}
          applicationId={applicationId}
        />
      ) : null}

      <section className={s.card}>
        <div className={s.sectionHead}>
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 19.5V4.5A1.5 1.5 0 015.5 3h10.4L20 7.1v12.4a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19.5z" />
              <path d="M9 11h6M9 15h6" />
            </svg>
            Application Details
          </h3>
          {!editing ? (
            <button type="button" className={s.editActionBtn} onClick={() => setEditing(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              Edit application
            </button>
          ) : null}
        </div>
        <form onSubmit={onSubmit}>
          {!editing ? (
            <div className={s.formGrid}>
              <article className={s.readField}>
                <span>Company</span>
                <p>{draft.company_name}</p>
              </article>
              <article className={s.readField}>
                <span>Role</span>
                <p>{draft.role_title}</p>
              </article>
              <article className={`${s.readField} ${s.full}`}>
                <span>Job Description</span>
                <p className={s.preWrap}>{draft.job_description}</p>
              </article>
              <article className={s.readField}>
                <span>Date Applied</span>
                <p>{draft.date_applied}</p>
              </article>
              <article className={s.readField}>
                <span>Status</span>
                <div className={s.readStatus}>
                  <StatusBadge status={draft.status} />
                </div>
              </article>
              <article className={`${s.readField} ${s.full}`}>
                <span>Notes</span>
                <p className={s.preWrap}>{draft.notes?.trim() || "No notes added."}</p>
              </article>
            </div>
          ) : (
            <div className={s.formGrid}>
              <label className={s.label}>
                Company
                <input className={s.input} value={draft.company_name} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} />
              </label>
              <label className={s.label}>
                Role
                <input className={s.input} value={draft.role_title} onChange={(e) => setDraft({ ...draft, role_title: e.target.value })} />
              </label>
              <label className={`${s.label} ${s.full}`}>
                Job Description
                <textarea className={s.textarea} value={draft.job_description} onChange={(e) => setDraft({ ...draft, job_description: e.target.value })} />
              </label>
              <label className={s.label}>
                Date Applied
                <input className={s.input} type="date" value={draft.date_applied} onChange={(e) => setDraft({ ...draft, date_applied: e.target.value })} />
              </label>
              <label className={s.label}>
                Status
                <select className={s.select} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ApplicationStatus })}>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className={`${s.label} ${s.full}`}>
                Notes
                <textarea className={s.textarea} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </label>
            </div>
          )}
          <div className={s.formActions}>
            <Link href={`/analysis?applicationId=${applicationId}`} className={s.secondaryBtn}>Open Analysis</Link>
            {editing ? (
              <>
                <button
                  type="button"
                  className={s.secondaryBtn}
                  onClick={() => {
                    setDraft(application);
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={s.primaryBtn} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : null}
          </div>
        </form>
      </section>

      <div className={s.historyGrid}>
        <section className={s.card}>
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 19h16M7 15V8M12 15V5M17 15v-3" />
            </svg>
            Analysis History
          </h3>
          {artifacts.analyses.length === 0 ? (
            <p className={s.empty}>No analysis stored yet for this application.</p>
          ) : (
            <div className={s.list}>
              {artifacts.analyses.map((item) => (
                <article key={item.id} className={s.item}>
                  <div className={s.itemMain}>
                    <p className={s.itemTitle}>{item.overall_match_percentage}% · {titleFromStatus(item.seniority_alignment)}</p>
                    <p className={s.itemMeta}>Updated {new Date(item.updated_at).toLocaleString()}</p>
                  </div>
                  <Link href={`/analysis?applicationId=${applicationId}`} className={s.itemAction}>Open</Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={s.card}>
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 3h9l4 4v14H6z" />
              <path d="M15 3v4h4" />
              <path d="M9 13h6M9 17h6" />
            </svg>
            Tailored CV Versions
          </h3>
          {artifacts.cv_versions.length === 0 ? (
            <p className={s.empty}>No tailored CV versions stored yet.</p>
          ) : (
            <div className={s.list}>
              {artifacts.cv_versions.map((item) => (
                <article key={item.id} className={s.item}>
                  <div className={s.itemMain}>
                    <p className={s.itemTitle}>{item.template_id} · {item.overall_match_percentage}% match</p>
                    <p className={s.itemMeta}>{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <Link href={`/cv-generator?applicationId=${applicationId}`} className={s.itemAction}>Open</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
