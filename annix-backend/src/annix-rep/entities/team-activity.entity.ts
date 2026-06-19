import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export enum TeamActivityType {
  MEMBER_JOINED = "member_joined",
  MEMBER_LEFT = "member_left",
  PROSPECT_CREATED = "prospect_created",
  PROSPECT_STATUS_CHANGED = "prospect_status_changed",
  PROSPECT_HANDOFF = "prospect_handoff",
  MEETING_COMPLETED = "meeting_completed",
  DEAL_WON = "deal_won",
  DEAL_LOST = "deal_lost",
  TERRITORY_ASSIGNED = "territory_assigned",
  NOTE_SHARED = "note_shared",
}

export class TeamActivity {
  id: number;

  organization: Organization;

  organizationId: number;

  user: User;

  userId: number;

  activityType: TeamActivityType;

  entityType: string;

  entityId: number | null;

  metadata: Record<string, unknown> | null;

  description: string | null;

  isVisibleToTeam: boolean;

  createdAt: Date;
}
