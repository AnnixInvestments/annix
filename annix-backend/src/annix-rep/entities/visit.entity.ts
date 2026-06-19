import { User } from "../../user/entities/user.entity";
import { Prospect } from "./prospect.entity";

export enum VisitType {
  COLD_CALL = "cold_call",
  SCHEDULED = "scheduled",
  FOLLOW_UP = "follow_up",
  DROP_IN = "drop_in",
}

export enum VisitOutcome {
  SUCCESSFUL = "successful",
  NO_ANSWER = "no_answer",
  RESCHEDULED = "rescheduled",
  NOT_INTERESTED = "not_interested",
  FOLLOW_UP_REQUIRED = "follow_up_required",
  CONVERTED = "converted",
}

export class Visit {
  id: number;

  prospect: Prospect;

  prospectId: number;

  salesRep: User;

  salesRepId: number;

  visitType: VisitType;

  scheduledAt: Date | null;

  startedAt: Date | null;

  endedAt: Date | null;

  checkInLatitude: number | null;

  checkInLongitude: number | null;

  checkOutLatitude: number | null;

  checkOutLongitude: number | null;

  outcome: VisitOutcome | null;

  notes: string | null;

  contactMet: string | null;

  nextSteps: string | null;

  followUpDate: Date | null;

  createdAt: Date;
}
