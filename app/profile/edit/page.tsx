"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getMyProfile, updateMyProfile, uploadCV } from "@/lib/api/profile";
import { useToast } from "@/components/ui/ToastProvider";
import { CandidateProfile } from "@/lib/types";

type ExperienceEditorEntry = {
  company_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  roles_text: string;
  highlights_text: string;
};

type CertificationEditorEntry = {
  title: string;
  provider: string;
  year: string;
  kind: "certification" | "course";
};

type ProfileEditorState = {
  email: string;
  linkedin_url: string;
  professional_summary: string;
  skills_entries: string[];
  certification_entries: CertificationEditorEntry[];
  education_text: string;
  goals_entries: string[];
  experience_entries: ExperienceEditorEntry[];
};

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractYear(text: string): string | null {
  const match = text.match(/(19|20)\d{2}/);
  return match ? match[0] : null;
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

function emptyEditorState(): ProfileEditorState {
  return {
    email: "",
    linkedin_url: "",
    professional_summary: "",
    skills_entries: [""],
    certification_entries: [],
    education_text: "",
    goals_entries: [""],
    experience_entries: [],
  };
}

function profileToEditor(profile: CandidateProfile): ProfileEditorState {
  return {
    email: profile.email || "",
    linkedin_url: profile.linkedin_url || "",
    professional_summary: profile.professional_summary || "",
    skills_entries: profile.skills?.length ? profile.skills : [""],
    certification_entries: (profile.certification_entries?.length
      ? profile.certification_entries.map((item) => ({
          title: item.title || "",
          provider: item.provider || "",
          year: item.year || "",
          kind: item.kind === "course" ? "course" : "certification",
        }))
      : profile.certifications.map((raw) => {
          const parsed = parseCertificationEntry(raw);
          return {
            title: parsed.name || "",
            provider: parsed.provider || "",
            year: parsed.year || "",
            kind: "certification" as const,
          };
        })),
    education_text: listToText(profile.education),
    goals_entries: profile.goals?.length ? profile.goals : [""],
    experience_entries: (profile.experience_entries || []).map((item) => ({
      company_name: item.company_name || "",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      is_current: item.is_current,
      roles_text: item.roles.join(", "),
      highlights_text: item.highlights.join("; "),
    })),
  };
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="profile-edit-section-header">
      <div className="profile-edit-section-icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
    </div>
  );
}

export default function EditProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [editor, setEditor] = useState<ProfileEditorState>(emptyEditorState());
  const [skillLevels, setSkillLevels] = useState<string[]>(["intermediate"]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("intermediate");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadProfile() {
    setLoading(true);
    try {
      const loaded = await getMyProfile();
      setProfile(loaded);
      const nextEditor = profileToEditor(loaded);
      setEditor(nextEditor);
      setSkillLevels(nextEditor.skills_entries.map(() => "intermediate"));
      setError(null);
    } catch {
      setProfile(null);
      setEditor(emptyEditorState());
      setSkillLevels(["intermediate"]);
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
      const nextEditor = profileToEditor(response.profile);
      setEditor(nextEditor);
      setSkillLevels(nextEditor.skills_entries.map(() => "intermediate"));
      toast.success("Profile extracted", "Review and adjust the extracted fields before saving.");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload CV.");
      toast.error("CV upload failed", e instanceof Error ? e.message : "Failed to upload CV.");
    } finally {
      setUploading(false);
    }
  }

  async function onSaveProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      const experienceEntries = editor.experience_entries
        .map((item) => ({
          company_name: item.company_name.trim(),
          start_date: item.start_date.trim() || null,
          end_date: item.is_current ? null : (item.end_date.trim() || null),
          is_current: item.is_current,
          roles: item.roles_text.split(",").map((x) => x.trim()).filter(Boolean),
          highlights: item.highlights_text.split(";").map((x) => x.trim()).filter(Boolean),
        }))
        .filter((item) => item.company_name);

      const certificationEntries = editor.certification_entries
        .map((item) => ({
          title: item.title.trim(),
          provider: item.provider.trim() || null,
          year: item.year.trim() || null,
          kind: item.kind,
        }))
        .filter((item) => item.title);

      const saved = await updateMyProfile({
        email: editor.email.trim() || null,
        linkedin_url: editor.linkedin_url.trim() || null,
        professional_summary: editor.professional_summary.trim() || null,
        skills: editor.skills_entries.map((item) => item.trim()).filter(Boolean),
        certification_entries: certificationEntries,
        education: textToList(editor.education_text),
        goals: editor.goals_entries.map((item) => item.trim()).filter(Boolean),
        experience_entries: experienceEntries,
      });

      setProfile(saved);
      const nextEditor = profileToEditor(saved);
      setEditor(nextEditor);
      setSkillLevels(nextEditor.skills_entries.map(() => "intermediate"));
      toast.success("Profile saved", "Your changes were applied.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save profile.";
      setError(message);
      toast.error("Profile save failed", message);
    } finally {
      setSavingProfile(false);
    }
  }

  function addExperienceEntry() {
    setEditor((prev) => ({
      ...prev,
      experience_entries: [
        ...prev.experience_entries,
        { company_name: "", start_date: "", end_date: "", is_current: false, roles_text: "", highlights_text: "" },
      ],
    }));
  }

  function updateExperienceEntry(index: number, patch: Partial<ExperienceEditorEntry>) {
    setEditor((prev) => ({
      ...prev,
      experience_entries: prev.experience_entries.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeExperienceEntry(index: number) {
    setEditor((prev) => ({
      ...prev,
      experience_entries: prev.experience_entries.filter((_, i) => i !== index),
    }));
  }

  function addCertificationEntry() {
    setEditor((prev) => ({
      ...prev,
      certification_entries: [
        ...prev.certification_entries,
        { title: "", provider: "", year: "", kind: "certification" },
      ],
    }));
  }

  function updateCertificationEntry(index: number, patch: Partial<CertificationEditorEntry>) {
    setEditor((prev) => ({
      ...prev,
      certification_entries: prev.certification_entries.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeCertificationEntry(index: number) {
    setEditor((prev) => ({
      ...prev,
      certification_entries: prev.certification_entries.filter((_, i) => i !== index),
    }));
  }

  function addSkillEntry() {
    setEditor((prev) => ({
      ...prev,
      skills_entries: [...prev.skills_entries, ""],
    }));
    setSkillLevels((prev) => [...prev, "intermediate"]);
  }

  function updateSkillEntry(index: number, value: string) {
    setEditor((prev) => ({
      ...prev,
      skills_entries: prev.skills_entries.map((item, i) => (i === index ? value : item)),
    }));
  }

  function removeSkillEntry(index: number) {
    setEditor((prev) => ({
      ...prev,
      skills_entries: prev.skills_entries.filter((_, i) => i !== index),
    }));
    setSkillLevels((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSkillLevel(index: number, value: string) {
    setSkillLevels((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addSkillFromDraft() {
    const skill = newSkillName.trim();
    if (!skill) return;
    setEditor((prev) => ({
      ...prev,
      skills_entries: [...prev.skills_entries, skill],
    }));
    setSkillLevels((prev) => [...prev, newSkillLevel]);
    setNewSkillName("");
    setNewSkillLevel("intermediate");
  }

  function addGoalEntry() {
    setEditor((prev) => ({
      ...prev,
      goals_entries: [...prev.goals_entries, ""],
    }));
  }

  function updateGoalEntry(index: number, value: string) {
    setEditor((prev) => ({
      ...prev,
      goals_entries: prev.goals_entries.map((item, i) => (i === index ? value : item)),
    }));
  }

  function removeGoalEntry(index: number) {
    setEditor((prev) => ({
      ...prev,
      goals_entries: prev.goals_entries.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="profile-page profile-edit-page">
      <div className="profile-edit-header-row">
        <div>
          <h2 className="page-title">Edit Profile</h2>
          <p className="page-subtitle">Update your career dossier. All sections are fully editable.</p>
        </div>
        <div className="profile-edit-header-actions">
          <Link className="profile-cancel-btn" href="/profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
          <button type="button" className="primary-link-btn" onClick={onSaveProfile} disabled={savingProfile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <section className="profile-edit-upload-card">
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
            <p>PDF or TXT — parse and update your profile automatically.</p>
          </div>
        </div>
        <div className="profile-edit-upload-actions">
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
            {uploading ? "Uploading..." : "Extract with AI"}
          </button>
          <button
            type="button"
            className="profile-upload-btn profile-upload-btn-ghost"
            onClick={() => setEditor(emptyEditorState())}
            disabled={uploading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Create manually
          </button>
        </div>
      </section>

      {loading ? <p className="muted">Loading current profile...</p> : null}
      {error ? <p className="muted" style={{ marginTop: 6 }}>{error}</p> : null}

      <div className="profile-edit-grid">
        <section className="profile-edit-section-card">
          <SectionHeader
            title="Basic Information"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21a8 8 0 10-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <div className="profile-editor-grid">
            <label className="profile-editor-field">
              Email
              <input className="profile-editor-input" value={editor.email} onChange={(e) => setEditor((v) => ({ ...v, email: e.target.value }))} />
            </label>
            <label className="profile-editor-field">
              LinkedIn URL
              <input className="profile-editor-input" value={editor.linkedin_url} onChange={(e) => setEditor((v) => ({ ...v, linkedin_url: e.target.value }))} />
            </label>
            <label className="profile-editor-field profile-editor-span-full">
              Professional Summary
              <textarea className="profile-editor-textarea profile-editor-summary" rows={5} value={editor.professional_summary} onChange={(e) => setEditor((v) => ({ ...v, professional_summary: e.target.value }))} />
            </label>
          </div>
        </section>

        <section className="profile-edit-section-card">
          <div className="profile-edit-section-row">
            <SectionHeader
              title="Skills"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                </svg>
              }
            />
            <button type="button" className="profile-add-btn" onClick={addSkillEntry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add empty skill
            </button>
          </div>
          <div className="profile-skill-chip-grid">
            {editor.skills_entries.map((item, index) => (
              <div key={`skill-${index}`} className="profile-skill-chip-edit">
                <input
                  className="profile-skill-name-input"
                  value={item}
                  onChange={(e) => updateSkillEntry(index, e.target.value)}
                  placeholder="Skill"
                />
                <select
                  className="profile-skill-level-select"
                  value={skillLevels[index] ?? "intermediate"}
                  onChange={(e) => updateSkillLevel(index, e.target.value)}
                >
                  <option value="expert">Expert</option>
                  <option value="advanced">Advanced</option>
                  <option value="intermediate">Intermediate</option>
                </select>
                <button type="button" className="profile-skill-remove" onClick={() => removeSkillEntry(index)} aria-label="Remove skill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="profile-skill-add-row">
            <input
              className="profile-editor-input"
              placeholder="Add skill..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkillFromDraft();
                }
              }}
            />
            <select className="profile-editor-input" value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value)}>
              <option value="expert">Expert</option>
              <option value="advanced">Advanced</option>
              <option value="intermediate">Intermediate</option>
            </select>
            <button type="button" className="profile-add-btn" onClick={addSkillFromDraft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add
            </button>
          </div>
        </section>

        <section className="profile-edit-section-card">
          <div className="profile-edit-section-row">
            <SectionHeader
              title="Experience"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="7" width="16" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 114 0v2M12 7V5a2 2 0 114 0v2" />
                </svg>
              }
            />
            <button type="button" className="profile-add-btn" onClick={addExperienceEntry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add role
            </button>
          </div>
          <div className="profile-entry-list">
            {editor.experience_entries.map((item, index) => (
              <article className="profile-edit-entry-card" key={`exp-${index}`}>
                <button type="button" className="profile-entry-float-remove" onClick={() => removeExperienceEntry(index)} aria-label="Remove experience">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="profile-entry-grid profile-entry-grid-3">
                  <label className="profile-editor-field">
                    Role
                    <input className="profile-editor-input" value={item.roles_text} onChange={(e) => updateExperienceEntry(index, { roles_text: e.target.value })} />
                  </label>
                  <label className="profile-editor-field">
                    Company
                    <input className="profile-editor-input" value={item.company_name} onChange={(e) => updateExperienceEntry(index, { company_name: e.target.value })} />
                  </label>
                  <label className="profile-editor-field">
                    Period
                    <input className="profile-editor-input" value={`${item.start_date}${item.start_date && (item.is_current || item.end_date) ? " - " : ""}${item.is_current ? "Present" : item.end_date}`} onChange={() => {}} readOnly />
                  </label>
                </div>
                <div className="profile-entry-grid" style={{ marginTop: 8 }}>
                  <label className="profile-editor-field">
                    Start date
                    <input type="month" className="profile-editor-input" value={item.start_date} onChange={(e) => updateExperienceEntry(index, { start_date: e.target.value })} />
                  </label>
                  <label className="profile-editor-field">
                    End date
                    <input type="month" className="profile-editor-input" value={item.end_date} onChange={(e) => updateExperienceEntry(index, { end_date: e.target.value })} disabled={item.is_current} />
                  </label>
                </div>
                <label className="profile-editor-field" style={{ marginTop: 8 }}>
                  Highlights (semicolon-separated)
                  <textarea className="profile-editor-textarea profile-editor-entry-notes" rows={3} value={item.highlights_text} onChange={(e) => updateExperienceEntry(index, { highlights_text: e.target.value })} />
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-edit-section-card">
          <div className="profile-edit-section-row">
            <SectionHeader
              title="Courses & Certifications"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c0 1.8 2.7 3 6 3s6-1.2 6-3v-5" />
                </svg>
              }
            />
            <button type="button" className="profile-add-btn" onClick={addCertificationEntry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add entry
            </button>
          </div>
          <div className="profile-entry-list">
            {editor.certification_entries.map((item, index) => (
              <article className="profile-edit-entry-card" key={`cert-${index}`}>
                <button type="button" className="profile-entry-float-remove" onClick={() => removeCertificationEntry(index)} aria-label="Remove certification">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="profile-entry-grid">
                  <label className="profile-editor-field">
                    Type
                    <select className="profile-editor-input" value={item.kind} onChange={(e) => updateCertificationEntry(index, { kind: e.target.value as "certification" | "course" })}>
                      <option value="certification">Certification</option>
                      <option value="course">Course</option>
                    </select>
                  </label>
                  <label className="profile-editor-field">
                    Year
                    <input className="profile-editor-input" value={item.year} onChange={(e) => updateCertificationEntry(index, { year: e.target.value })} />
                  </label>
                  <label className="profile-editor-field profile-editor-span-full">
                    Title
                    <input className="profile-editor-input" value={item.title} onChange={(e) => updateCertificationEntry(index, { title: e.target.value })} />
                  </label>
                  <label className="profile-editor-field profile-editor-span-full">
                    Provider
                    <input className="profile-editor-input" value={item.provider} onChange={(e) => updateCertificationEntry(index, { provider: e.target.value })} />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-edit-section-card">
          <div className="profile-edit-section-row">
            <SectionHeader
              title="Goals"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 8l8-4 8 4-8 4-8-4z" />
                  <path d="M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" />
                </svg>
              }
            />
            <button type="button" className="profile-add-btn" onClick={addGoalEntry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add goal
            </button>
          </div>
          <div className="profile-string-entry-list">
            {editor.goals_entries.map((item, index) => (
              <div key={`goal-${index}`} className="profile-string-entry-row">
                <input className="profile-editor-input" value={item} onChange={(e) => updateGoalEntry(index, e.target.value)} placeholder="Add goal" />
                <button type="button" className="profile-remove-btn" onClick={() => removeGoalEntry(index)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-edit-section-card">
          <SectionHeader
            title="Education"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8l8-4 8 4-8 4-8-4z" />
                <path d="M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" />
              </svg>
            }
          />
          <label className="profile-editor-field">
            Education (one per line)
            <textarea className="profile-editor-textarea profile-editor-list" rows={7} value={editor.education_text} onChange={(e) => setEditor((v) => ({ ...v, education_text: e.target.value }))} />
          </label>
        </section>
      </div>
    </div>
  );
}
