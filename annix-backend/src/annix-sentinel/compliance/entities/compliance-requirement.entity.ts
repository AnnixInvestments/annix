export class AnnixSentinelComplianceRequirement {
  id!: number;

  code!: string;

  name!: string;

  description!: string;

  regulator!: string;

  category!: string;

  applicableConditions!: Record<string, unknown> | null;

  frequency!: string;

  deadlineRule!: Record<string, unknown> | null;

  penaltyDescription!: string | null;

  guidanceUrl!: string | null;

  requiredDocuments!: string[] | null;

  checklistSteps!: string[] | null;

  tier!: number;
}
