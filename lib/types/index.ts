export type ApplicationStatus = "SAVED" | "APPLIED" | "INTERVIEWING" | "REJECTED" | "OFFER";

export interface Application {
  id: number;
  company_name: string;
  role_title: string;
  job_description: string;
  date_applied: string;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_applications: number;
  active_interviews: number;
  rejections: number;
  offers: number;
  interview_rate: number;
}

export interface MatchAnalysisResponse {
  match_score: {
    overall_match_percentage: number;
    skill_overlap: string[];
    missing_critical_skills: string[];
    seniority_alignment: string;
  };
  gap_breakdown: {
    hard_skill_gaps: string[];
    experience_gaps: string[];
    leadership_signals_missing: string[];
    keyword_optimization_gaps: string[];
    weak_impact_statements: string[];
  };
  bullet_level_improvements: Array<{
    original_bullet: string;
    improved_bullet: string;
    stronger_action_verb: string;
    impact_framing_note: string;
    passive_language_found: boolean;
  }>;
}

export interface CVGenerateResponse {
  professional_summary: string;
  reordered_skills: string[];
  rewritten_experience_bullets: Array<{ original: string; rewritten: string }>;
  deprioritized_content: string[];
  template_id: string;
  generated_pdf_filename: string;
}


export interface CandidateProfile {
  id: number;
  email: string | null;
  linkedin_url: string | null;
  professional_summary: string | null;
  skills: string[];
  experiences: string[];
  certifications: string[];
  education: string[];
  goals: string[];
  normalized_cv_text: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}
