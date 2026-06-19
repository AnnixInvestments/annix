import { AnnixOrbitCompany } from "./annix-orbit-company.entity";
import { InterviewBooking } from "./interview-booking.entity";
import { JobPosting } from "./job-posting.entity";

export class InterviewSlot {
  id: number;

  company: AnnixOrbitCompany;

  companyId: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  startsAt: Date;

  endsAt: Date;

  locationLabel: string | null;

  locationAddress: string | null;

  locationLat: number | null;

  locationLng: number | null;

  capacity: number;

  notes: string | null;

  isCancelled: boolean;

  bookings: InterviewBooking[];

  createdAt: Date;

  updatedAt: Date;
}
