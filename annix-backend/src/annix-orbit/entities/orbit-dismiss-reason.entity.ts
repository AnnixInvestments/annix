// When a seeker dismisses a job with this reason, optionally apply a strong
// filter as well: "company" mutes that job's company, "category" mutes its
// category. null = no deterministic filter (the dismissal still feeds the
// semantic learning penalty).
export type DismissReasonMuteAction = "company" | "category";

export class OrbitDismissReason {
  id: number;

  code: string;

  label: string;

  muteAction: DismissReasonMuteAction | null;

  sortOrder: number;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
