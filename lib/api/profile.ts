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
