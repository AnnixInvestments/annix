import { Address } from "../../lib/value-objects";
import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";
import { Territory } from "./territory.entity";

export enum ProspectStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  PROPOSAL = "proposal",
  WON = "won",
  LOST = "lost",
}

export enum ProspectPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum FollowUpRecurrence {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
}

export class Prospect {
  id: number;

  owner: User;

  ownerId: number;

  companyName: string;

  contactName: string | null;

  contactEmail: string | null;

  contactPhone: string | null;

  contactTitle: string | null;

  address: Address | null;

  country: string;

  latitude: number | null;

  longitude: number | null;

  googlePlaceId: string | null;

  discoverySource: string | null;

  discoveredAt: Date | null;

  externalId: string | null;

  status: ProspectStatus;

  priority: ProspectPriority;

  notes: string | null;

  tags: string[] | null;

  estimatedValue: number | null;

  crmExternalId: string | null;

  crmSyncStatus: string | null;

  crmLastSyncedAt: Date | null;

  lastContactedAt: Date | null;

  nextFollowUpAt: Date | null;

  followUpRecurrence: FollowUpRecurrence;

  customFields: Record<string, unknown> | null;

  score: number;

  scoreUpdatedAt: Date | null;

  assignedToId: number | null;

  organization: Organization | null;

  organizationId: number | null;

  territory: Territory | null;

  territoryId: number | null;

  isSharedWithTeam: boolean;

  sharedNotesVisible: boolean;

  createdAt: Date;

  updatedAt: Date;
}
