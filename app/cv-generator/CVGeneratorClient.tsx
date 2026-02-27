"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { analyzeMatch, exportCVPdf, generateCV, getLatestCVVersion } from "@/lib/api/analysis";
import { getApplication } from "@/lib/api/applications";
import { getMyProfile } from "@/lib/api/profile";
import { Application, CVGenerateResponse, CandidateProfile, MatchAnalysisResponse } from "@/lib/types";
import s from "./tailored.module.css";

const TEMPLATES: Array<{ id: "minimal" | "structured" | "executive"; name: string; description: string }> = [
  { id: "minimal", name: "Minimal", description: "Clean single-column layout focused on readability" },
  { id: "structured", name: "Structured", description: "Two-column layout with skills sidebar" },
  { id: "executive", name: "Executive", description: "Senior-level format emphasizing leadership and impact" },
];

type TemplateId = "minimal" | "structured" | "executive";
type CanonicalExperience = {
  role: string;
  company: string;
  period: string;
  highlights: string[];
};
type CanonicalCredential = {
  title: string;
  provider: string | null;
  year: string | null;
  kind: "certification" | "course";
};
type CanonicalCV = {
  name: string;
  roleTitle: string;
  contact: string[];
  professionalSummary: string;
  skills: string[];
  experience: CanonicalExperience[];
  credentials: CanonicalCredential[];
  education: string[];
  goals: string[];
  deprioritized: string[];
  matchPercentage: number;
};

function displayName(profile: CandidateProfile | null): string {
  if (!profile?.email) return "Candidate";
  const local = profile.email.split("@")[0] || "candidate";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPeriod(startDate: string | null, endDate: string | null, isCurrent: boolean): string {
  const start = startDate?.trim() || "";
  if (!start && !endDate && !isCurrent) return "";
  if (isCurrent) return start ? `${start} - Present` : "Present";
  if (start && endDate) return `${start} - ${endDate}`;
  return start || endDate || "";
}

function renderCredential(item: CanonicalCredential): string {
  const suffix = [item.provider, item.year].filter(Boolean).join(" · ");
  return `${item.title}${suffix ? ` (${suffix})` : ""}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCanonicalCV(
  profile: CandidateProfile | null,
  app: Application,
  analysis: MatchAnalysisResponse | null,
  cv: CVGenerateResponse | null,
): CanonicalCV {
  const rewrites = new Map(
    (cv?.rewritten_experience_bullets ?? []).map((item) => [item.original.trim().toLowerCase(), item.rewritten]),
  );

  const experience: CanonicalExperience[] = profile?.experience_entries?.length
    ? profile.experience_entries.map((entry) => ({
        role: entry.roles[0] || "Role",
        company: entry.company_name,
        period: formatPeriod(entry.start_date, entry.end_date, entry.is_current),
        highlights: (entry.highlights.length ? entry.highlights : ["No highlights available"])
          .map((bullet) => rewrites.get(bullet.trim().toLowerCase()) || bullet),
      }))
    : [{
        role: app.role_title,
        company: app.company_name,
        period: "",
        highlights: (cv?.rewritten_experience_bullets ?? []).map((item) => item.rewritten),
      }];

  const credentials: CanonicalCredential[] = profile?.certification_entries?.length
    ? profile.certification_entries.map((item) => ({
        title: item.title,
        provider: item.provider ?? null,
        year: item.year ?? null,
        kind: item.kind === "course" ? "course" : "certification",
      }))
    : (profile?.certifications ?? []).map((title) => ({
        title,
        provider: null,
        year: null,
        kind: "certification" as const,
      }));

  return {
    name: displayName(profile),
    roleTitle: app.role_title,
    contact: [profile?.email, profile?.linkedin_url].filter(Boolean) as string[],
    professionalSummary: cv?.professional_summary || profile?.professional_summary || "",
    skills: cv?.reordered_skills?.length ? cv.reordered_skills : (profile?.skills ?? []),
    experience,
    credentials,
    education: profile?.education ?? [],
    goals: profile?.goals ?? [],
    deprioritized: cv?.deprioritized_content ?? [],
    matchPercentage: analysis?.match_score.overall_match_percentage ?? 0,
  };
}

function buildTemplateHtml(cv: CanonicalCV, template: TemplateId): string {
  const skillsHtml = cv.skills
    .map((skill) => `<span class=\"chip\">${escapeHtml(skill)}</span>`)
    .join("");

  const experienceHtml = cv.experience
    .map((entry) => {
      const bullets = entry.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("");
      return `<section class=\"item\"><div class=\"row\"><h4>${escapeHtml(entry.role)} · ${escapeHtml(entry.company)}</h4>${entry.period ? `<small>${escapeHtml(entry.period)}</small>` : ""}</div><ul>${bullets}</ul></section>`;
    })
    .join("");

  const credentialsHtml = cv.credentials.length
    ? cv.credentials.map((entry) => `<li>${escapeHtml(renderCredential(entry))} <em>(${escapeHtml(entry.kind)})</em></li>`).join("")
    : "<li>Not specified</li>";

  const educationHtml = cv.education.length
    ? cv.education.map((value) => `<li>${escapeHtml(value)}</li>`).join("")
    : "<li>Not specified</li>";

  const goalsHtml = cv.goals.length
    ? cv.goals.map((value) => `<li>${escapeHtml(value)}</li>`).join("")
    : "<li>Not specified</li>";

  const baseCss = `
:root { --ink:#1d2436; --muted:#5f6b82; --line:#e9edf4; --chip:#f2f5fa; }
* { box-sizing:border-box; }
body { margin:0; padding:0; font-family: \"DM Sans\", Arial, sans-serif; color:var(--ink); }
.page { width:210mm; min-height:297mm; margin:0 auto; padding:14mm; background:#fff; }
.head h1 { margin:0; font-size:30px; line-height:1.08; font-weight:700; }
.head .role { margin:5px 0 0; color:var(--muted); font-size:18px; }
.head .contact { margin:4px 0 0; color:var(--muted); font-size:13px; }
.divider { margin:12px 0; border-top:1px solid var(--line); }
h3 { margin:0 0 7px; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#7a859b; }
p { margin:0; font-size:13.5px; line-height:1.55; color:#2f3850; }
.chips { display:flex; flex-wrap:wrap; gap:6px; }
.chip { background:var(--chip); border-radius:999px; padding:4px 10px; font-size:12px; color:#46526b; }
.section { margin-bottom:13px; }
.item { margin-bottom:10px; }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
.row h4 { margin:0; font-size:14px; font-weight:600; }
.row small { color:#6f7b92; font-size:12px; }
ul { margin:6px 0 0 17px; padding:0; }
li { margin:0 0 4px; font-size:13px; line-height:1.5; color:#2f3850; }
em { color:#7a859b; font-style:normal; font-size:12px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { margin:0; width:auto; min-height:0; padding:12mm; } }
`;

  if (template === "structured") {
    return `<!doctype html><html><head><meta charset=\"utf-8\"/><title>Tailored CV</title><style>${baseCss}.layout{display:grid;grid-template-columns:36% 1fr;gap:16px;}</style></head><body><main class=\"page\"><header class=\"head\"><h1>${escapeHtml(cv.name)}</h1><p class=\"role\">${escapeHtml(cv.roleTitle)}</p><p class=\"contact\">${escapeHtml(cv.contact.join(" · "))}</p></header><div class=\"divider\"></div><div class=\"layout\"><aside><section class=\"section\"><h3>Key Skills</h3><div class=\"chips\">${skillsHtml}</div></section><section class=\"section\"><h3>Certifications & Courses</h3><ul>${credentialsHtml}</ul></section><section class=\"section\"><h3>Education</h3><ul>${educationHtml}</ul></section><section class=\"section\"><h3>Goals</h3><ul>${goalsHtml}</ul></section></aside><section><section class=\"section\"><h3>Professional Summary</h3><p>${escapeHtml(cv.professionalSummary || "Not provided")}</p></section><section class=\"section\"><h3>Experience</h3>${experienceHtml}</section></section></div></main></body></html>`;
  }

  if (template === "executive") {
    return `<!doctype html><html><head><meta charset=\"utf-8\"/><title>Tailored CV</title><style>${baseCss}.head h1{font-size:32px}.kpi{margin:8px 0 0;display:inline-block;border:1px solid #ffd6ca;color:#d76745;border-radius:999px;padding:3px 10px;font-size:12px}</style></head><body><main class=\"page\"><header class=\"head\"><h1>${escapeHtml(cv.name)}</h1><p class=\"role\">${escapeHtml(cv.roleTitle)}</p><p class=\"contact\">${escapeHtml(cv.contact.join(" · "))}</p><span class=\"kpi\">Match ${cv.matchPercentage}%</span></header><div class=\"divider\"></div><section class=\"section\"><h3>Executive Profile</h3><p>${escapeHtml(cv.professionalSummary || "Not provided")}</p></section><section class=\"section\"><h3>Core Capabilities</h3><div class=\"chips\">${skillsHtml}</div></section><section class=\"section\"><h3>Leadership Experience</h3>${experienceHtml}</section><section class=\"section\"><h3>Credentials</h3><ul>${credentialsHtml}</ul></section><section class=\"section\"><h3>Education</h3><ul>${educationHtml}</ul></section><section class=\"section\"><h3>Career Goals</h3><ul>${goalsHtml}</ul></section></main></body></html>`;
  }

  return `<!doctype html><html><head><meta charset=\"utf-8\"/><title>Tailored CV</title><style>${baseCss}</style></head><body><main class=\"page\"><header class=\"head\"><h1>${escapeHtml(cv.name)}</h1><p class=\"role\">${escapeHtml(cv.roleTitle)}</p><p class=\"contact\">${escapeHtml(cv.contact.join(" · "))}</p></header><div class=\"divider\"></div><section class=\"section\"><h3>Professional Summary</h3><p>${escapeHtml(cv.professionalSummary || "Not provided")}</p></section><section class=\"section\"><h3>Core Skills</h3><div class=\"chips\">${skillsHtml}</div></section><section class=\"section\"><h3>Experience</h3>${experienceHtml}</section><section class=\"section\"><h3>Certifications & Courses</h3><ul>${credentialsHtml}</ul></section><section class=\"section\"><h3>Education</h3><ul>${educationHtml}</ul></section><section class=\"section\"><h3>Career Goals</h3><ul>${goalsHtml}</ul></section></main></body></html>`;
}


export default function CVGeneratorPage() {
  const searchParams = useSearchParams();
  const applicationIdRaw = searchParams.get("applicationId");
  const applicationId = applicationIdRaw ? Number(applicationIdRaw) : null;

  const [application, setApplication] = useState<Application | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysisResponse | null>(null);
  const [result, setResult] = useState<CVGenerateResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("minimal");
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateHtml, setShowTemplateHtml] = useState(false);

  useEffect(() => {
    (async () => {
      if (!applicationId || Number.isNaN(applicationId)) {
        setLoadingInitial(false);
        return;
      }
      setLoadingInitial(true);
      setError(null);
      try {
        const [loadedApp, loadedProfile, latest] = await Promise.all([
          getApplication(applicationId),
          getMyProfile().catch(() => null),
          getLatestCVVersion(applicationId).catch(() => null),
        ]);
        setApplication(loadedApp);
        setProfile(loadedProfile);
        if (latest) {
          setSelectedTemplate(latest.template_id);
          setResult({
            professional_summary: latest.professional_summary,
            reordered_skills: latest.reordered_skills,
            rewritten_experience_bullets: latest.rewritten_experience_bullets,
            deprioritized_content: latest.deprioritized_content,
            template_id: latest.template_id,
            generated_pdf_filename: latest.generated_pdf_filename,
          });
          setAnalysis(latest.analysis);
          setSavingNote(`Loaded saved version from ${new Date(latest.created_at).toLocaleString()}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tailored CV context.");
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [applicationId]);

  async function generateTailored(forceRefresh: boolean) {
    if (!application || !profile?.normalized_cv_text) return;
    setLoading(true);
    setError(null);
    setSavingNote(null);
    try {
      const analysisResult = await analyzeMatch({
        cv_text: profile.normalized_cv_text,
        job_description: application.job_description,
        application_id: application.id,
        force_refresh: forceRefresh,
      });
      const generated = await generateCV({
        application_id: application.id,
        original_cv_text: profile.normalized_cv_text,
        job_description: application.job_description,
        analysis: analysisResult,
        template_id: selectedTemplate,
        save_version: true,
      });
      setAnalysis(analysisResult);
      setResult(generated);
      setSavingNote("Version saved for this application and analysis.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate tailored CV.");
    } finally {
      setLoading(false);
    }
  }

  const headerSubtitle = useMemo(() => {
    if (!application) return "Loading application...";
    return `${application.company_name} · ${application.role_title}`;
  }, [application]);

  const canonical = useMemo(() => {
    if (!application || !profile) return null;
    return buildCanonicalCV(profile, application, analysis, result);
  }, [profile, application, analysis, result]);

  async function downloadCurrent() {
    if (!canonical) return;
    try {
      setError(null);
      const html = buildTemplateHtml(canonical, selectedTemplate);
      const baseName = result?.generated_pdf_filename || `application-${applicationId ?? "cv"}-tailored-${selectedTemplate}.pdf`;
      const blob = await exportCVPdf({ html, filename: baseName });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export PDF.");
    }
  }

  if (!applicationId || Number.isNaN(applicationId)) {
    return (
      <div>
        <h2 className="page-title">Tailored CV</h2>
        <p className="page-subtitle">Open this page from Match Analysis so we can link it to a specific application.</p>
        <Link href="/applications" className={s.linkBtn}>Go to Applications</Link>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.head}>
        <Link href={`/analysis?applicationId=${applicationId}`} className={s.backBtn} aria-label="Back to analysis">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div>
          <h2 className="page-title">Tailored CV</h2>
          <p className="page-subtitle">{headerSubtitle}</p>
        </div>
      </div>

      {loadingInitial ? <p className="muted">Loading...</p> : null}
      {error ? <p className="muted">{error}</p> : null}
      {!profile && !loadingInitial ? <p className="muted">Upload your profile CV first in Profile.</p> : null}
      {profile && !result ? <p className="muted">Previewing baseline profile template. Generate/Regenerate to apply AI tailoring.</p> : null}
      {savingNote ? <p className="muted">{savingNote}</p> : null}

      <div className={s.grid}>
        <aside className={s.sidebar}>
          <section className={s.card}>
            <h3 className={s.eyebrow}>Select Template</h3>
            <div className={s.templateList}>
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`${s.templateItem} ${selectedTemplate === template.id ? s.activeTemplate : ""}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className={s.templateHead}>
                    <strong>{template.name}</strong>
                    {selectedTemplate === template.id ? <span>✓</span> : null}
                  </div>
                  <p>{template.description}</p>
                </button>
              ))}
            </div>
          </section>

          <div className={s.actionStack}>
            <button type="button" className={s.secondaryAction} onClick={() => generateTailored(false)} disabled={loading || !application || !profile}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16" /><path d="M12 4v16" /></svg>
              {loading ? "Generating..." : "Generate Tailored CV"}
            </button>
            <button type="button" className={s.primaryAction} onClick={downloadCurrent} disabled={!canonical}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
              Download PDF
            </button>
            <button type="button" className={s.secondaryAction} onClick={() => setShowTemplateHtml((v) => !v)} disabled={!canonical}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 4l-4 8 4 8" /><path d="M16 4l4 8-4 8" /></svg>
              {showTemplateHtml ? "Hide Template HTML" : "View Template HTML"}
            </button>
            <button type="button" className={s.secondaryAction} disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h11l3 3v13H5z" /><path d="M9 4v5h6" /></svg>
              Save Version
            </button>
            <button type="button" className={s.ghostAction} onClick={() => generateTailored(true)} disabled={loading || !application || !profile}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0115.36-6.36" /><path d="M18 3v4h-4" /><path d="M21 12a9 9 0 01-15.36 6.36" /><path d="M6 21v-4h4" /></svg>
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </aside>

        <section className={s.previewCard}>
          {!canonical ? (
            <div className={s.emptyPreview}>
              <p>Upload a profile CV first to preview and export templates.</p>
            </div>
          ) : (
            <article className={`${s.templatePreview} ${selectedTemplate === "structured" ? s.templateStructured : selectedTemplate === "executive" ? s.templateExecutive : s.templateMinimal}`}>
              <header className={s.previewHeader}>
                <h3>{canonical.name}</h3>
                <p>{canonical.roleTitle}</p>
                <small>{canonical.contact.join(" · ")}</small>
              </header>
              {selectedTemplate === "structured" ? (
                <div className={s.structuredLayout}>
                  <aside className={s.structuredAside}>
                    <div className={s.previewSection}>
                      <div className={s.previewSectionHead}>
                        <h4>Key Skills</h4>
                        <span>Reordered</span>
                      </div>
                      <div className={s.skillTags}>
                        {canonical.skills.map((skill) => {
                          const matching = analysis?.match_score.skill_overlap.some((item) => item.toLowerCase() === skill.toLowerCase());
                          return <em key={skill} className={matching ? s.skillMatch : s.skillNeutral}>{skill}</em>;
                        })}
                      </div>
                    </div>

                    <div className={s.previewSection}>
                      <h4 className={s.experienceTitle}>Certifications & Courses</h4>
                      <ul className={s.improvementList}>
                        {canonical.credentials.map((item, idx) => (
                          <li key={`${item.title}-${idx}`}>
                            <span>{item.kind === "course" ? "Course" : "Cert"}</span>
                            <p>{renderCredential(item)}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={s.previewSection}>
                      <h4 className={s.experienceTitle}>Education</h4>
                      <ul className={s.improvementList}>
                        {canonical.education.map((item, idx) => (
                          <li key={`${item}-${idx}`}>
                            <span>Included</span>
                            <p>{item}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </aside>

                  <section className={s.structuredMain}>
                    <div className={s.previewSection}>
                      <div className={s.previewSectionHead}>
                        <h4>Professional Summary</h4>
                        <span>Rewritten</span>
                      </div>
                      <p>{canonical.professionalSummary || "Not provided"}</p>
                    </div>
                    <div className={s.previewSection}>
                      <h4 className={s.experienceTitle}>Experience</h4>
                      <div className={s.experienceBlocks}>
                        {canonical.experience.map((entry, entryIndex) => (
                          <article key={`${entry.company}-${entryIndex}`} className={s.experienceBlock}>
                            <div className={s.experienceMeta}>
                              <strong>{entry.role} · {entry.company}</strong>
                              {entry.period ? <small>{entry.period}</small> : null}
                            </div>
                            <ul className={s.improvementList}>
                              {entry.highlights.map((bullet, idx) => (
                                <li key={`${entry.company}-${idx}`}>
                                  <span>Improved</span>
                                  <p>{bullet}</p>
                                </li>
                              ))}
                            </ul>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div className={s.previewSection}>
                      <h4 className={s.experienceTitle}>Career Goals</h4>
                      <ul className={s.improvementList}>
                        {canonical.goals.map((item, idx) => (
                          <li key={`${item}-${idx}`}>
                            <span>Included</span>
                            <p>{item}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              ) : selectedTemplate === "executive" ? (
                <>
                  <div className={s.executiveHero}>
                    <div className={s.previewSectionHead}>
                      <h4>Executive Profile</h4>
                      <span>Match {canonical.matchPercentage}%</span>
                    </div>
                    <p>{canonical.professionalSummary || "Not provided"}</p>
                  </div>

                  <div className={s.previewSection}>
                    <div className={s.previewSectionHead}>
                      <h4>Core Capabilities</h4>
                      <span>Prioritized</span>
                    </div>
                    <div className={s.skillTags}>
                      {canonical.skills.map((skill) => {
                        const matching = analysis?.match_score.skill_overlap.some((item) => item.toLowerCase() === skill.toLowerCase());
                        return <em key={skill} className={matching ? s.skillMatch : s.skillNeutral}>{skill}</em>;
                      })}
                    </div>
                  </div>

                  <div className={s.previewSection}>
                    <h4 className={s.experienceTitle}>Leadership Experience</h4>
                    <div className={s.experienceBlocks}>
                      {canonical.experience.map((entry, entryIndex) => (
                        <article key={`${entry.company}-${entryIndex}`} className={s.experienceBlock}>
                          <div className={s.experienceMeta}>
                            <strong>{entry.role} · {entry.company}</strong>
                            {entry.period ? <small>{entry.period}</small> : null}
                          </div>
                          <ul className={s.improvementList}>
                            {entry.highlights.map((bullet, idx) => (
                              <li key={`${entry.company}-${idx}`}>
                                <span>Improved</span>
                                <p>{bullet}</p>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className={s.previewSection}>
                    <h4 className={s.experienceTitle}>Credentials</h4>
                    <ul className={s.improvementList}>
                      {canonical.credentials.map((item, idx) => (
                        <li key={`${item.title}-${idx}`}>
                          <span>{item.kind === "course" ? "Course" : "Cert"}</span>
                          <p>{renderCredential(item)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className={s.previewSection}>
                    <div className={s.previewSectionHead}>
                      <h4>Professional Summary</h4>
                      <span>Rewritten</span>
                    </div>
                    <p>{canonical.professionalSummary || "Not provided"}</p>
                  </div>

                  <div className={s.previewSection}>
                    <div className={s.previewSectionHead}>
                      <h4>Core Skills</h4>
                      <span>Reordered</span>
                    </div>
                    <div className={s.skillTags}>
                      {canonical.skills.map((skill) => {
                        const matching = analysis?.match_score.skill_overlap.some((item) => item.toLowerCase() === skill.toLowerCase());
                        return <em key={skill} className={matching ? s.skillMatch : s.skillNeutral}>{skill}</em>;
                      })}
                    </div>
                  </div>

                  <div className={s.previewSection}>
                    <h4 className={s.experienceTitle}>Experience</h4>
                    <div className={s.experienceBlocks}>
                      {canonical.experience.map((entry, entryIndex) => (
                        <article key={`${entry.company}-${entryIndex}`} className={s.experienceBlock}>
                          <div className={s.experienceMeta}>
                            <strong>{entry.role} · {entry.company}</strong>
                            {entry.period ? <small>{entry.period}</small> : null}
                          </div>
                          <ul className={s.improvementList}>
                            {entry.highlights.map((bullet, idx) => (
                              <li key={`${entry.company}-${idx}`}>
                                <span>Improved</span>
                                <p>{bullet}</p>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className={s.previewSection}>
                    <h4 className={s.experienceTitle}>Certifications & Courses</h4>
                    <ul className={s.improvementList}>
                      {canonical.credentials.map((item, idx) => (
                        <li key={`${item.title}-${idx}`}>
                          <span>{item.kind === "course" ? "Course" : "Cert"}</span>
                          <p>{renderCredential(item)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </article>
          )}
        </section>
      </div>

      {showTemplateHtml && canonical ? (
        <section className={s.card} style={{ marginTop: 12 }}>
          <h3 className={s.eyebrow}>Template HTML Preview ({selectedTemplate})</h3>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#44506a", maxHeight: 360, overflow: "auto" }}>
            {buildTemplateHtml(canonical, selectedTemplate)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
