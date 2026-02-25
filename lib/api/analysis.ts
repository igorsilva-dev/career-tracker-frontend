import { apiFetch } from "@/lib/api/client";
import { CVGenerateResponse, MatchAnalysisResponse } from "@/lib/types";

export function analyzeMatch(payload: {
  cv_text: string;
  job_description: string;
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
  template_id: "classic" | "modern" | "compact";
}): Promise<CVGenerateResponse> {
  return apiFetch<CVGenerateResponse>("/api/v1/cv/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
