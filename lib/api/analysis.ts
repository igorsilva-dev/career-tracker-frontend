import { apiFetch, apiFetchBlob } from "@/lib/api/client";
import { CVGenerateResponse, CVStoredVersion, MatchAnalysisResponse } from "@/lib/types";

export function analyzeMatch(payload: {
  cv_text: string;
  job_description: string;
  application_id?: number;
  force_refresh?: boolean;
}): Promise<MatchAnalysisResponse> {
  return apiFetch<MatchAnalysisResponse>("/api/v1/analysis/match", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateCV(payload: {
  application_id: number;
  original_cv_text: string;
  job_description: string;
  analysis: MatchAnalysisResponse;
  template_id: "minimal" | "structured" | "executive";
  save_version?: boolean;
}): Promise<CVGenerateResponse> {
  return apiFetch<CVGenerateResponse>("/api/v1/cv/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLatestCVVersion(applicationId: number): Promise<CVStoredVersion> {
  return apiFetch<CVStoredVersion>(`/api/v1/cv/applications/${applicationId}/latest`);
}

export function exportCVPdf(payload: { html: string; filename: string }): Promise<Blob> {
  return apiFetchBlob("/api/v1/cv/export-pdf", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
