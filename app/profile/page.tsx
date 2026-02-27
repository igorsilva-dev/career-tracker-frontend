"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getMyProfile } from "@/lib/api/profile";
import { CandidateProfile } from "@/lib/types";

function titleCase(value: string): string {
  const particles = new Set(["da", "de", "do", "das", "dos", "del", "della", "di"]);
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index > 0 && particles.has(lower)) return lower;
      return lower[0].toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function dedupeRepeatedName(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";

  const tokens = compact.split(" ");
  if (tokens.length % 2 === 0) {
    const half = tokens.length / 2;
    const left = tokens.slice(0, half).join(" ").toLowerCase();
    const right = tokens.slice(half).join(" ").toLowerCase();
    if (left === right) return tokens.slice(0, half).join(" ");
  }

  const deduped: string[] = [];
  for (const token of tokens) {
    const last = deduped[deduped.length - 1];
    if (!last || last.toLowerCase() !== token.toLowerCase()) {
      deduped.push(token);
    }
  }
  return deduped.join(" ");
}

function extractNameFromCvText(cvText: string): string | null {
  const lines = cvText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const raw of lines) {
    const leftSide = raw.split(/[|,-]/)[0]?.trim() ?? raw;
    const candidate = dedupeRepeatedName(leftSide);
    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 6) continue;
    if (/@|https?:\/\//i.test(candidate)) continue;
    if (/\d/.test(candidate)) continue;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/.test(candidate)) continue;

    return candidate;
  }
  return null;
}

function deriveName(profile: CandidateProfile): string {
  const fromCv = extractNameFromCvText(profile.normalized_cv_text || "");
  if (fromCv) return fromCv;

  if (profile.email) {
    const local = profile.email.split("@")[0];
    if (local) return titleCase(dedupeRepeatedName(local));
  }
  return "CareerTracker Candidate";
}

function deriveRole(profile: CandidateProfile): string {
  const summary = profile.professional_summary?.trim();
  if (!summary) return "Professional";
  const firstSentence = summary.split(/[.!?]/)[0]?.trim();
  return firstSentence && firstSentence.length < 64 ? firstSentence : "Professional";
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? "T");
}

function extractYear(text: string): string | null {
  const match = text.match(/(19|20)\d{2}/);
  return match ? match[0] : null;
}

function parseExperienceEntry(raw: string): { role: string; company: string; period: string; bullets: string[] } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const periodMatch = cleaned.match(/(19|20)\d{2}(\s*[-–]\s*(present|(19|20)\d{2}))?/i);
  const period = periodMatch ? periodMatch[0].replace(/\s+/g, " ") : "";
  const withoutPeriod = periodMatch ? cleaned.replace(periodMatch[0], "").trim() : cleaned;

  const splitByAt = withoutPeriod.split(/\s+at\s+/i);
  let role = splitByAt[0] ?? "Experience";
  let company = splitByAt[1] ?? "";

  if (!company && withoutPeriod.includes(" - ")) {
    const [left, right] = withoutPeriod.split(" - ");
    role = left;
    company = right ?? "";
  }

  const bullets = cleaned
    .split(/[;•]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 16)
    .slice(0, 3);

  return {
    role: role || "Experience",
    company,
    period,
    bullets,
  };
}

function formatPeriod(startDate: string | null, endDate: string | null, isCurrent: boolean): string {
  const start = startDate?.trim() || "Unknown start";
  if (isCurrent) return `${start} - Present`;
  if (endDate?.trim()) return `${start} - ${endDate.trim()}`;
  return `${start} - Unknown end`;
}

function parseEducationEntry(raw: string): { degree: string; institution: string; year: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const year = extractYear(cleaned) ?? "";
  const withoutYear = year ? cleaned.replace(year, "").replace(/[()]/g, "").trim() : cleaned;

  if (withoutYear.includes(",")) {
    const [degree, ...rest] = withoutYear.split(",");
    return { degree: degree.trim(), institution: rest.join(",").trim(), year };
  }

  if (withoutYear.includes(" - ")) {
    const [degree, institution] = withoutYear.split(" - ");
    return { degree: degree.trim(), institution: (institution ?? "").trim(), year };
  }

  return { degree: withoutYear, institution: "", year };
}

function parseCertificationEntry(raw: string): { name: string; provider: string; year: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const year = extractYear(cleaned) ?? "";
  const withoutYear = year ? cleaned.replace(year, "").replace(/[()]/g, "").trim() : cleaned;

  if (withoutYear.includes(",")) {
    const [name, ...rest] = withoutYear.split(",");
    return { name: name.trim(), provider: rest.join(",").trim(), year };
  }

  if (withoutYear.includes(" - ")) {
    const [name, provider] = withoutYear.split(" - ");
    return { name: name.trim(), provider: (provider ?? "").trim(), year };
  }

  return { name: withoutYear, provider: "", year };
}

type CertConfidence = { label: "High" | "Medium" | "Low"; className: "high" | "medium" | "low" };

function certificationConfidence(parsed: { provider: string; year: string }): CertConfidence {
  const hasProvider = Boolean(parsed.provider.trim());
  const hasYear = Boolean(parsed.year.trim());
  if (hasProvider && hasYear) return { label: "High", className: "high" };
  if (hasProvider || hasYear) return { label: "Medium", className: "medium" };
  return { label: "Low", className: "low" };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const loaded = await getMyProfile();
        setProfile(loaded);
        setError(null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const computed = useMemo(() => {
    if (!profile) {
      return {
        name: "CareerTracker Candidate",
        role: "Professional",
        avatar: "CT",
        completeness: 0,
      };
    }

    const checks = [
      profile.skills.length > 0,
      (profile.experience_entries?.length ?? 0) > 0 || profile.experiences.length > 0,
      (profile.certification_entries?.length ?? 0) > 0 || profile.certifications.length > 0,
      profile.education.length > 0,
      Boolean(profile.professional_summary?.trim()),
    ];

    const done = checks.filter(Boolean).length;

    return {
      name: deriveName(profile),
      role: deriveRole(profile),
      avatar: initials(deriveName(profile)).toUpperCase(),
      completeness: Math.round((done / checks.length) * 100),
    };
  }, [profile]);

  const experienceTimeline = useMemo(() => {
    if (!profile) return [];

    if (profile.experience_entries?.length) {
      return profile.experience_entries.map((item) => ({
        company: item.company_name || "Company",
        period: formatPeriod(item.start_date, item.end_date, item.is_current),
        roles: item.roles?.length ? item.roles : ["Role not detected"],
        highlights: item.highlights ?? [],
      }));
    }

    return profile.experiences.map((raw) => {
      const parsed = parseExperienceEntry(raw);
      return {
        company: parsed.company || "Company",
        period: parsed.period || "Period not detected",
        roles: [parsed.role || "Role not detected"],
        highlights: parsed.bullets,
      };
    });
  }, [profile]);

  return (
    <div className="profile-page">
      <div className="applications-head applications-head-tight">
        <div>
          <h2 className="page-title">Profile</h2>
          <p className="page-subtitle">Your professional baseline. View extracted data and open a dedicated editor when needed.</p>
        </div>
        <Link className="primary-link-btn" href="/profile/edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
          Edit Profile
        </Link>
      </div>

      {error ? <p className="muted" style={{ marginTop: 8 }}>{error}</p> : null}
      {loading ? <p className="muted">Loading profile...</p> : null}

      {!loading && !profile ? (
        <section className="profile-card">
          <p className="muted" style={{ marginBottom: 12 }}>No profile found yet. Create one manually or upload a CV from the editor page.</p>
          <Link className="primary-link-btn" href="/profile/edit">Create Profile</Link>
        </section>
      ) : null}

      {profile ? (
        <>
          <section className="profile-card">
            <div className="profile-progress-head">
              <div className="profile-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                </svg>
                <h3>Profile Completeness</h3>
              </div>
              <strong>{computed.completeness}%</strong>
            </div>
            <div className="profile-progress-track">
              <div className="profile-progress-fill" style={{ width: `${computed.completeness}%` }} />
            </div>
            <div className="profile-checks">
              <span className={profile.skills.length ? "ok" : "warn"}>{profile.skills.length ? "Skills parsed" : "Add skills"}</span>
              <span className={(profile.experience_entries?.length || profile.experiences.length) ? "ok" : "warn"}>
                {(profile.experience_entries?.length || profile.experiences.length) ? "Experience found" : "Add experience"}
              </span>
              <span className={(profile.certification_entries?.length || profile.certifications.length) ? "ok" : "warn"}>
                {(profile.certification_entries?.length || profile.certifications.length) ? "Certifications found" : "Add certifications"}
              </span>
            </div>
          </section>

          <section className="profile-card profile-identity-card">
            <div className="profile-identity-head">
              <div className="profile-avatar">{computed.avatar}</div>
              <div>
                <h3>{computed.name}</h3>
                <p className="profile-role">{computed.role}</p>
                <p className="profile-meta">{profile.linkedin_url ? profile.linkedin_url : "LinkedIn not detected"} {profile.email ? ` • ${profile.email}` : ""}</p>
              </div>
            </div>

            <div className="profile-divider" />

            <h4 className="profile-subheading">Summary</h4>
            <p className="profile-summary">
              {profile.professional_summary?.trim() || "Upload a stronger summary in your CV to improve match quality and tailoring precision."}
            </p>
          </section>

          <section className="profile-card">
            <div className="profile-section-title section-space-between">
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                </svg>
                <h3>Skills</h3>
              </div>
              <span className="muted">{profile.skills.length} extracted</span>
            </div>
            <div className="profile-skills-grid">
              {profile.skills.length ? profile.skills.map((skill, index) => {
                const level = index % 3 === 0 ? "Expert" : index % 3 === 1 ? "Advanced" : "Intermediate";
                const className = level === "Intermediate" ? "skill-chip neutral" : "skill-chip";
                return (
                  <span key={`${skill}-${index}`} className={className}>
                    {skill}
                    <small>{level}</small>
                  </span>
                );
              }) : <p className="muted">No skills extracted yet.</p>}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="7" width="16" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 114 0v2M12 7V5a2 2 0 114 0v2" />
              </svg>
              <h3>Experience</h3>
            </div>

            <div className="experience-timeline">
              {experienceTimeline.length ? experienceTimeline.map((entry, index) => {
                return (
                  <article key={`${entry.company}-${entry.period}-${index}`} className="experience-item">
                    <div className="timeline-dot" />
                    <div>
                      <div className="experience-row">
                        <div>
                          <h4>{entry.company}</h4>
                          <p>{entry.roles.join(" · ")}</p>
                        </div>
                        <span className="experience-period">{entry.period}</span>
                      </div>
                      {entry.highlights.length ? (
                        <ul>
                          {entry.highlights.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                );
              }) : <p className="muted">No experience extracted yet.</p>}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                <path d="M6 12v5c0 1.8 2.7 3 6 3s6-1.2 6-3v-5" />
              </svg>
              <h3>Courses & Certifications</h3>
            </div>

            <div className="education-grid">
              {(profile.certification_entries?.length || profile.certifications.length) ? (
                (profile.certification_entries?.length
                  ? profile.certification_entries.map((entry) => ({
                      name: entry.title,
                      provider: entry.provider || "",
                      year: entry.year || "",
                      kind: entry.kind || "certification",
                    }))
                  : profile.certifications.map((raw) => {
                      const parsed = parseCertificationEntry(raw);
                      return { name: parsed.name, provider: parsed.provider, year: parsed.year, kind: "certification" };
                    })
                ).map((parsed, index) => {
                const confidence = certificationConfidence(parsed);
                return (
                  <article key={`${parsed.name}-${index}`} className="education-item">
                    <div>
                      <h4>{parsed.name || "Certification"}</h4>
                      <p>{parsed.provider || "Provider not detected"}</p>
                    </div>
                    <div className="cert-meta">
                      <span className="cert-kind">{parsed.kind === "course" ? "Course" : "Certification"}</span>
                      <span className={`cert-confidence ${confidence.className}`}>{confidence.label} confidence</span>
                      <span className="education-year">{parsed.year || "—"}</span>
                    </div>
                  </article>
                );
              })
              ) : <p className="muted">No certifications extracted yet.</p>}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 8l8-4 8 4-8 4-8-4z" />
                <path d="M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" />
              </svg>
              <h3>Education</h3>
            </div>

            <div className="education-grid">
              {profile.education.length ? profile.education.map((raw, index) => {
                const parsed = parseEducationEntry(raw);
                return (
                  <article key={`${raw}-${index}`} className="education-item">
                    <div>
                      <h4>{parsed.degree || "Education"}</h4>
                      <p>{parsed.institution || "Institution"}</p>
                    </div>
                    <span className="education-year">{parsed.year || "—"}</span>
                  </article>
                );
              }) : <p className="muted">No education extracted yet.</p>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
