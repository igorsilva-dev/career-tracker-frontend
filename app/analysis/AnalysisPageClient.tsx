"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { analyzeMatch } from "@/lib/api/analysis";
import { getApplication } from "@/lib/api/applications";
import { getMyProfile } from "@/lib/api/profile";
import { Application, CandidateProfile, MatchAnalysisResponse } from "@/lib/types";
import s from "./AnalysisPageClient.module.css";

function scoreTone(score: number): "stretch" | "aligned" | "strong" {
  if (score < 70) return "stretch";
  if (score < 85) return "aligned";
  return "strong";
}

function seniorityBadgeLabel(value?: string): string {
  if (!value) return "Aligned";
  if (value.toLowerCase() === "underqualified") return "Stretch";
  if (value.toLowerCase() === "overqualified") return "Overqualified";
  return "Aligned";
}

function ringClass(score: number): string {
  const tone = scoreTone(score);
  if (tone === "stretch") return `${s.ring} ${s.stretch}`;
  if (tone === "aligned") return `${s.ring} ${s.aligned}`;
  return `${s.ring} ${s.strong}`;
}

function ringStrokeColor(score: number): string {
  const tone = scoreTone(score);
  if (tone === "stretch") return "#f0a128";
  if (tone === "aligned") return "#23a15f";
  return "#1f9a57";
}

function narrativeFromResult(result: MatchAnalysisResponse): string {
  const overlapLead = result.match_score.skill_overlap.slice(0, 3).join(", ");
  const gapLead = result.gap_breakdown.hard_skill_gaps[0] || result.match_score.missing_critical_skills[0];
  if (!overlapLead && !gapLead) {
    return "Your profile aligns with this role. Review gaps and bullet suggestions below to improve interview conversion.";
  }
  if (!gapLead) {
    return `Your profile shows strong alignment in ${overlapLead}. Fine-tune bullet impact to strengthen positioning.`;
  }
  if (!overlapLead) {
    return `You have baseline relevance, but a key gap is ${gapLead}. Addressing this in your CV can improve match quality.`;
  }
  return `Your profile shows strong ${overlapLead} experience but lacks ${gapLead} required by this role.`;
}

function HeaderIcon({ type }: { type: "skill" | "gap" | "suggest" }) {
  if (type === "skill") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (type === "gap") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86l-7 12.13A2 2 0 005 19h14a2 2 0 001.71-3l-7-12.14a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2z" />
    </svg>
  );
}

function XBulletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}

export default function AnalysisPageClient() {
  const searchParams = useSearchParams();
  const applicationIdParam = searchParams.get("applicationId");
  const applicationId = applicationIdParam ? Number(applicationIdParam) : null;

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [result, setResult] = useState<MatchAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        const profilePromise = getMyProfile().catch(() => null);
        const appPromise = applicationId ? getApplication(applicationId).catch(() => null) : Promise.resolve(null);
        const [loadedProfile, loadedApplication] = await Promise.all([profilePromise, appPromise]);
        setProfile(loadedProfile);
        setApplication(loadedApplication);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [applicationId]);

  async function runAnalysis(forceRefresh = false) {
    if (!profile?.normalized_cv_text || !application?.job_description) return;

    setLoading(true);
    setError(null);
    try {
      const response = await analyzeMatch({
        cv_text: profile.normalized_cv_text,
        job_description: application.job_description,
        application_id: application.id,
        force_refresh: forceRefresh,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run analysis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!profile?.normalized_cv_text || !application?.job_description) return;
    autoTriggeredRef.current = true;
    runAnalysis();
  }, [profile, application]);

  const score = result?.match_score.overall_match_percentage ?? 0;
  const ring = useMemo(() => {
    const radius = 45;
    const stroke = 8;
    const normalized = Math.max(0, Math.min(score, 100));
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalized / 100) * circumference;
    return { radius, stroke, circumference, offset };
  }, [score]);

  if (!applicationId) {
    return (
      <div className={s.root}>
        <h1 className={s.title}>Match Analysis</h1>
        <p className={s.subtitle}>Open an application from the Applications table to run contextual analysis.</p>
        <div className={s.emptyState}>
          <p>Use the Analyze action from an application row to prefill this page.</p>
          <Link href="/applications" className={s.primaryButton}>Go to Applications</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.head}>
        <Link href="/applications" className={s.backButton} aria-label="Back to applications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className={s.title}>Match Analysis</h1>
          <p className={s.subtitle}>{application ? `${application.company_name} · ${application.role_title}` : "Loading application..."}</p>
        </div>
      </div>

      {initialLoading ? <p className={s.message}>Loading context...</p> : null}
      {error ? <p className={s.message}>{error}</p> : null}
      {!profile ? <p className={s.message}>No profile found. Upload your CV in Profile first.</p> : null}
      {!application ? <p className={s.message}>Application not found.</p> : null}

      {profile && application ? (
        <>
          <section className={`${s.card} ${s.mergedTopCard}`}>
            <div className={s.mergedTopGrid}>
              <div className={s.applicationPane}>
                <h2 className={s.eyebrow}>Application</h2>
                <dl className={s.definitionList}>
                  <dt>Company</dt>
                  <dd>{application.company_name}</dd>
                  <dt>Role</dt>
                  <dd>{application.role_title}</dd>
                  <dt>Status</dt>
                  <dd><StatusBadge status={application.status} /></dd>
                  <dt>Applied</dt>
                  <dd>{application.date_applied}</dd>
                </dl>
                <Link href="/applications" className={s.secondaryButton}>Edit Application</Link>
              </div>

              <div className={s.summaryPane}>
              {!result ? (
                <div className={s.pendingWrap}>
                  <p className={s.message}>Run analysis to see structured match insights.</p>
                  <button type="button" onClick={() => runAnalysis()} className={s.primaryButton} disabled={loading}>
                    {loading ? "Analyzing..." : "Analyze Match"}
                  </button>
                </div>
              ) : (
                <div className={s.summaryContent}>
                  <div className={ringClass(score)}>
                    <svg viewBox="0 0 120 120" className={s.ringSvg} aria-hidden>
                      <circle cx="60" cy="60" r={ring.radius} className={s.ringTrack} strokeWidth={ring.stroke} />
                      <circle
                        cx="60"
                        cy="60"
                        r={ring.radius}
                        className={s.ringProgress}
                        strokeWidth={ring.stroke}
                        stroke={ringStrokeColor(score)}
                        strokeDasharray={ring.circumference}
                        strokeDashoffset={ring.offset}
                      />
                    </svg>
                    <div className={s.ringInner}>
                      <strong>{score}%</strong>
                      <span>Match</span>
                    </div>
                  </div>

                  <div className={s.summaryText}>
                    <span className={`${s.tone} ${s[scoreTone(score)]}`}>
                      {seniorityBadgeLabel(result.match_score.seniority_alignment)}
                    </span>
                    <p className={s.narrative}>{narrativeFromResult(result)}</p>
                    <button type="button" onClick={() => runAnalysis(true)} className={s.rerunButton} disabled={loading}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 12a9 9 0 0115.36-6.36" />
                        <path d="M18 3v4h-4" />
                        <path d="M21 12a9 9 0 01-15.36 6.36" />
                        <path d="M6 21v-4h4" />
                      </svg>
                      {loading ? "Re-analyzing..." : "Rerun analysis"}
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </section>

          {result ? (
            <div className={s.stack}>
              <section className={s.card}>
                <div className={`${s.sectionHead} ${s.skillHead}`}>
                  <HeaderIcon type="skill" />
                  <h3>Skill Overlap</h3>
                </div>
                <p className={s.sectionSubhead}>Matching Skills</p>
                <div className={s.tagGrid}>
                  {result.match_score.skill_overlap.map((skill) => (
                    <span key={skill} className={`${s.tag} ${s.tagPositive}`}>{skill}</span>
                  ))}
                </div>
                <p className={s.sectionSubhead}>Missing Critical Skills</p>
                <div className={s.tagGrid}>
                  {result.match_score.missing_critical_skills.map((skill) => (
                    <span key={skill} className={`${s.tag} ${s.tagNegative}`}>{skill}</span>
                  ))}
                </div>
              </section>

              <section className={s.card}>
                <div className={`${s.sectionHead} ${s.gapHead}`}>
                  <HeaderIcon type="gap" />
                  <h3>Gap Analysis</h3>
                </div>
                <div className={s.gapGrid}>
                  <div>
                    <h4>Hard Skill Gaps</h4>
                    <ul>
                      {result.gap_breakdown.hard_skill_gaps.map((item) => (
                        <li key={item}><XBulletIcon /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Experience Gaps</h4>
                    <ul>
                      {result.gap_breakdown.experience_gaps.map((item) => (
                        <li key={item}><XBulletIcon /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Leadership Signals Missing</h4>
                    <ul>
                      {result.gap_breakdown.leadership_signals_missing.map((item) => (
                        <li key={item}><XBulletIcon /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Keyword Optimization</h4>
                    <ul>
                      {result.gap_breakdown.keyword_optimization_gaps.map((item) => (
                        <li key={item}><XBulletIcon /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className={s.card}>
                <div className={`${s.sectionHead} ${s.suggestHead}`}>
                  <HeaderIcon type="suggest" />
                  <h3>CV Improvement Suggestions</h3>
                </div>

                <div className={s.suggestionsWrap}>
                  {result.bullet_level_improvements.map((item, index) => (
                    <article key={`${item.original_bullet}-${index}`} className={s.suggestionCard}>
                      <span className={s.suggestionChip}>{item.passive_language_found ? "Impact & Scale" : "Refinement"}</span>
                      <p className={s.suggestionLabel}>Original</p>
                      <p className={s.originalText}>{item.original_bullet}</p>
                      <p className={s.suggestionLabel}>Suggested</p>
                      <p className={s.suggestedText}>{item.improved_bullet}</p>
                    </article>
                  ))}
                </div>
              </section>

              <div className={s.ctaRow}>
                <Link href={`/cv-generator?applicationId=${application.id}`} className={s.primaryButton}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                  </svg>
                  Generate Tailored CV
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
