import { User } from "../../user/entities/user.entity";
import { MeetingType } from "./meeting.entity";

export interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export class BookingLink {
  id: number;

  user: User;

  userId: number;

  slug: string;

  name: string;

  meetingDurationMinutes: number;

  bufferBeforeMinutes: number;

  bufferAfterMinutes: number;

  availableDays: string;

  availableStartHour: number;

  availableEndHour: number;

  maxDaysAhead: number;

  isActive: boolean;

  customQuestions: CustomQuestion[] | null;

  meetingType: MeetingType;

  location: string | null;

  description: string | null;

  createdAt: Date;

  updatedAt: Date;
}
