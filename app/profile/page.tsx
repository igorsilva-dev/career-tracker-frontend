"use client";

import { useEffect, useState } from "react";

import { CardHeader } from "@/components/ui/CardHeader";
import { getMyProfile, uploadCV } from "@/lib/api/profile";
import { CandidateProfile } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <h2 className="page-title">Profile</h2>
      <p className="page-subtitle">Upload your CV once. We extract and reuse profile data across the product.</p>

      <section className="card" style={{ marginBottom: 16 }}>
        <CardHeader title="CV Upload" subtitle="Supported formats: PDF and TXT." />
        <label>
          Upload CV
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
        </label>
        {uploading ? <p className="muted">Extracting profile...</p> : null}
        {error ? <p className="muted">{error}</p> : null}
      </section>

      <section className="card">
        <CardHeader title="Extracted Profile" subtitle="Generated from your latest uploaded CV." />
        {loading ? <p className="muted">Loading profile...</p> : null}
        {!loading && !profile ? <p className="muted">No profile found yet. Upload a CV to get started.</p> : null}
        {profile ? (
          <div className="grid">
            <article className="list-item"><strong>Email:</strong> {profile.email ?? "-"}</article>
            <article className="list-item"><strong>LinkedIn:</strong> {profile.linkedin_url ?? "-"}</article>
            <article className="list-item"><strong>Summary:</strong> {profile.professional_summary ?? "-"}</article>
            <article className="list-item"><strong>Skills:</strong> {profile.skills.join(", ") || "-"}</article>
            <article className="list-item"><strong>Experience:</strong> {profile.experiences.join(" | ") || "-"}</article>
            <article className="list-item"><strong>Education:</strong> {profile.education.join(" | ") || "-"}</article>
            <article className="list-item"><strong>Certifications:</strong> {profile.certifications.join(" | ") || "-"}</article>
            <article className="list-item"><strong>Goals:</strong> {profile.goals.join(" | ") || "-"}</article>
          </div>
        ) : null}
      </section>
    </div>
  );
}
