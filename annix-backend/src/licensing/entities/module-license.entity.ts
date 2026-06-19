export class ModuleLicense {
  id: number;

  companyId: number;

  moduleKey: string;

  tier: string;

  featureOverrides: Record<string, boolean>;

  validFrom: Date | null;

  validUntil: Date | null;

  active: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
