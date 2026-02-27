import { apiFetch } from "@/lib/api/client";
import { CandidateProfile } from "@/lib/types";

export function getMyProfile(): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/v1/profile/me");
}

export function uploadCV(file: File): Promise<{ profile: CandidateProfile; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<{ profile: CandidateProfile; message: string }>("/api/v1/profile/upload-cv", {
    method: "POST",
    body: formData,
  });
}

export function updateMyProfile(payload: Partial<{
  email: string | null;
  linkedin_url: string | null;
  professional_summary: string | null;
  skills: string[];
  experiences: string[];
  experience_entries: Array<{
    company_name: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    roles: string[];
    highlights: string[];
  }>;
  certifications: string[];
  certification_entries: Array<{
    title: string;
    provider: string | null;
    year: string | null;
    kind: string;
  }>;
  education: string[];
  goals: string[];
}>): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/api/v1/profile/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
