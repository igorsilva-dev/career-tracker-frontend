"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getMyProfile, uploadCV } from "@/lib/api/profile";
import { CandidateProfile } from "@/lib/types";

function titleCase(value: string): string {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveName(profile: CandidateProfile): string {
  if (profile.email) {
    const local = profile.email.split("@")[0];
    if (local) return titleCase(local);
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadProfile() {
    setLoading(true);
    try {
      setProfile(await getMyProfile());
      setError(null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const response = await uploadCV(file);
      setProfile(response.profile);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload CV.");
    } finally {
      setUploading(false);
    }
  }

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
      profile.experiences.length > 0,
      profile.certifications.length > 0,
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

  return (
    <div className="profile-page">
      <h2 className="page-title">Profile</h2>
      <p className="page-subtitle">Your professional baseline. Upload a CV and we extract structured data for matching and tailoring.</p>

      <section className="profile-card profile-upload-strip">
        <div className="profile-upload-left">
          <div className="profile-upload-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12" />
              <path d="M7 8l5-5 5 5" />
              <path d="M5 15v3a3 3 0 003 3h8a3 3 0 003-3v-3" />
            </svg>
          </div>
          <div>
            <h3>CV Upload</h3>
            <p>PDF or TXT. We parse and extract your profile automatically.</p>
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="sr-only"
          />
          <button type="button" className="profile-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3v12" />
              <path d="M7 8l5-5 5 5" />
              <path d="M5 15v3a3 3 0 003 3h8a3 3 0 003-3v-3" />
            </svg>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </section>

      {error ? <p className="muted" style={{ marginTop: 8 }}>{error}</p> : null}

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
          <span className={profile?.skills.length ? "ok" : "warn"}>{profile?.skills.length ? "Skills parsed" : "Add skills"}</span>
          <span className={profile?.experiences.length ? "ok" : "warn"}>{profile?.experiences.length ? "Experience found" : "Add experience"}</span>
          <span className={profile?.certifications.length ? "ok" : "warn"}>{profile?.certifications.length ? "Certifications found" : "Add certifications"}</span>
        </div>
      </section>

      <section className="profile-card profile-identity-card">
        {loading ? <p className="muted">Loading profile...</p> : null}
        {!loading && !profile ? <p className="muted">No profile found yet. Upload a CV to get started.</p> : null}
        {profile ? (
          <>
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
          </>
        ) : null}
      </section>

      {profile ? (
        <>
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
              {profile.experiences.length ? profile.experiences.map((raw, index) => {
                const parsed = parseExperienceEntry(raw);
                return (
                  <article key={`${raw}-${index}`} className="experience-item">
                    <div className="timeline-dot" />
                    <div>
                      <div className="experience-row">
                        <div>
                          <h4>{parsed.role}</h4>
                          <p>{parsed.company || "Company"}</p>
                        </div>
                        <span className="experience-period">{parsed.period || "Period not detected"}</span>
                      </div>
                      {parsed.bullets.length ? (
                        <ul>
                          {parsed.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}
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
