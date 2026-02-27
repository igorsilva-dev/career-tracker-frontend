import { apiFetch } from "@/lib/api/client";
import { Application, ApplicationArtifacts, ApplicationStatus, DashboardMetrics } from "@/lib/types";

export function listApplications(): Promise<Application[]> {
  return apiFetch<Application[]>("/api/v1/applications");
}

export function getApplication(applicationId: number): Promise<Application> {
  return apiFetch<Application>(`/api/v1/applications/${applicationId}`);
}

export function getMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>("/api/v1/applications/dashboard/metrics");
}

export function createApplication(payload: {
  company_name: string;
  role_title: string;
  job_description: string;
  date_applied: string;
  status: string;
  notes?: string;
}): Promise<Application> {
  return apiFetch<Application>("/api/v1/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateApplication(
  applicationId: number,
  payload: Partial<{
    company_name: string;
    role_title: string;
    job_description: string;
    date_applied: string;
    status: ApplicationStatus;
    notes: string | null;
  }>,
): Promise<Application> {
  return apiFetch<Application>(`/api/v1/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getApplicationArtifacts(applicationId: number): Promise<ApplicationArtifacts> {
  return apiFetch<ApplicationArtifacts>(`/api/v1/applications/${applicationId}/artifacts`);
}
