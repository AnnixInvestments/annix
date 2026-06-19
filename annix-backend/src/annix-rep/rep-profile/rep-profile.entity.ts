import { User } from "../../user/entities/user.entity";
import { Organization } from "../entities/organization.entity";

export interface TargetCustomerProfile {
  businessTypes?: string[];
  companySizes?: string[];
  decisionMakerTitles?: string[];
}

export class RepProfile {
  id: number;

  user: User;

  userId: number;

  industry: string;

  subIndustries: string[];

  productCategories: string[];

  companyName: string | null;

  jobTitle: string | null;

  territoryDescription: string | null;

  defaultSearchLatitude: number | null;

  defaultSearchLongitude: number | null;

  defaultSearchRadiusKm: number;

  targetCustomerProfile: TargetCustomerProfile | null;

  customSearchTerms: string[] | null;

  setupCompleted: boolean;

  setupCompletedAt: Date | null;

  defaultBufferBeforeMinutes: number;

  defaultBufferAfterMinutes: number;

  workingHoursStart: string;

  workingHoursEnd: string;

  workingDays: string;

  organization: Organization | null;

  organizationId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
