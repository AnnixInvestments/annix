import { User } from "../../user/entities/user.entity";
import { Prospect } from "./prospect.entity";

export enum ProspectActivityType {
  CREATED = "created",
  STATUS_CHANGE = "status_change",
  NOTE_ADDED = "note_added",
  FOLLOW_UP_COMPLETED = "follow_up_completed",
  FOLLOW_UP_SNOOZED = "follow_up_snoozed",
  FIELD_UPDATED = "field_updated",
  TAG_ADDED = "tag_added",
  TAG_REMOVED = "tag_removed",
  MERGED = "merged",
  CONTACTED = "contacted",
  OWNERSHIP_CHANGED = "ownership_changed",
}

export class ProspectActivity {
  id: number;

  prospect: Prospect;

  prospectId: number;

  user: User;

  userId: number;

  activityType: ProspectActivityType;

  oldValues: Record<string, unknown> | null;

  newValues: Record<string, unknown> | null;

  description: string | null;

  metadata: Record<string, unknown> | null;

  createdAt: Date;
}
