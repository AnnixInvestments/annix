export class AnnixSentinelRegulatoryUpdate {
  id!: number;

  title!: string;

  summary!: string;

  category!: string;

  effectiveDate!: Date | null;

  sourceUrl!: string | null;

  affectedRequirementCodes!: string[] | null;

  publishedAt!: Date;
}
