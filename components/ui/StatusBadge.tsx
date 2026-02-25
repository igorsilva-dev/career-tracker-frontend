import { ApplicationStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const statusClassMap: Record<ApplicationStatus, string> = {
  SAVED: "chip chip-saved",
  APPLIED: "chip chip-applied",
  INTERVIEWING: "chip chip-interviewing",
  REJECTED: "chip chip-rejected",
  OFFER: "chip chip-offer",
};

const statusLabelMap: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  REJECTED: "Rejected",
  OFFER: "Offer",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={statusClassMap[status]}>{statusLabelMap[status]}</span>;
}
