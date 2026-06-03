import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { fromISO, fromJSDate, now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { InterviewBooking } from "../entities/interview-booking.entity";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { buildCalendar, type CalendarEvent } from "./ics.util";
import { InterviewBookingService } from "./interview-booking.service";
import {
  SeekerInterviewEventsService,
  type SeekerInterviewEventView,
} from "./seeker-interview-events.service";

function toIsoLoose(value: Date | string | null | undefined): string {
  if (value == null) return "";
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? (dt.toISO() ?? "") : "";
}

function bookingToEvent(booking: InterviewBooking): CalendarEvent | null {
  const slot = booking.slot;
  if (!slot) return null;
  const job = slot.jobPosting;
  const title = job ? job.title : "Interview";
  const location = slot.locationLabel ? slot.locationLabel : slot.locationAddress;
  return {
    uid: `booking-${booking.id}@orbit.annix`,
    startsAt: toIsoLoose(slot.startsAt),
    endsAt: toIsoLoose(slot.endsAt),
    summary: `Interview: ${title}`,
    location: location ? location : null,
    description: "Interview booked through Annix Orbit.",
  };
}

function selfEventToEvent(view: SeekerInterviewEventView): CalendarEvent {
  const role = view.roleTitle;
  const company = view.companyName;
  const titleCore = role ? role : company ? company : "Interview";
  return {
    uid: `self-${view.id}@orbit.annix`,
    startsAt: view.startsAt,
    endsAt: view.endsAt,
    summary: `Interview: ${titleCore}`,
    location: view.locationLabel,
    description: view.notes,
  };
}

@Injectable()
export class SeekerCalendarService {
  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly interviewBookingService: InterviewBookingService,
    private readonly interviewEventsService: SeekerInterviewEventsService,
  ) {}

  async ensureFeedToken(userId: number): Promise<string | null> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) return null;
    const existing = profile.calendarFeedToken;
    if (existing) return existing;
    const token = randomBytes(24).toString("hex");
    profile.calendarFeedToken = token;
    profile.calendarFeedTokenCreatedAt = now().toJSDate();
    await this.profileRepo.save(profile);
    return token;
  }

  async eventsForEmail(email: string): Promise<CalendarEvent[]> {
    const bookings = await this.interviewBookingService.bookingsForIndividualByEmail(email);
    const bookingEvents = bookings
      .map(bookingToEvent)
      .filter((event): event is CalendarEvent => event !== null);
    const selfViews = await this.interviewEventsService.listForSeeker(email);
    const selfEvents = selfViews.map(selfEventToEvent);
    return [...bookingEvents, ...selfEvents].filter((event) => event.startsAt.length > 0);
  }

  async icsForToken(token: string): Promise<string> {
    const stamp = now().toISO() ?? "";
    const profile = await this.profileRepo.findByCalendarFeedToken(token);
    if (!profile) return buildCalendar([], stamp);
    const user = await this.userRepo.findById(profile.userId);
    const email = user ? user.email : null;
    if (!email) return buildCalendar([], stamp);
    const events = await this.eventsForEmail(email);
    return buildCalendar(events, stamp);
  }
}
