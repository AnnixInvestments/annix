import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fromISO, fromJSDate, now, nowMillis } from "../../lib/datetime";
import { CvEmailTemplateKind } from "../entities/annix-orbit-email-template.entity";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { InterviewBooking, InterviewBookingStatus } from "../entities/interview-booking.entity";
import { InterviewInvite } from "../entities/interview-invite.entity";
import { InterviewSlot } from "../entities/interview-slot.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { InterviewBookingRepository } from "../repositories/interview-booking.repository";
import { InterviewInviteRepository } from "../repositories/interview-invite.repository";
import { InterviewSlotRepository } from "../repositories/interview-slot.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { EmailTemplateService } from "./email-template.service";

const INVITE_TOKEN_TTL_DAYS = 30;

interface CreateSlotInput {
  startsAt: Date;
  endsAt: Date;
  locationLabel?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  capacity?: number;
  notes?: string | null;
}

@Injectable()
export class InterviewBookingService {
  private readonly logger = new Logger(InterviewBookingService.name);

  constructor(
    private readonly slotRepo: InterviewSlotRepository,
    private readonly bookingRepo: InterviewBookingRepository,
    private readonly inviteRepo: InterviewInviteRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async listSlotsForJob(companyId: number, jobPostingId: number): Promise<InterviewSlot[]> {
    await this.assertJobOwnership(companyId, jobPostingId);
    return this.slotRepo.listForJob(companyId, jobPostingId);
  }

  async listSlotsForCompany(companyId: number, fromIso: string | null): Promise<InterviewSlot[]> {
    const fromDateTime = fromIso ? fromISO(fromIso) : now().minus({ days: 1 });
    const fromDate = fromDateTime.toJSDate();
    const toDate = fromDateTime.plus({ days: 90 }).toJSDate();
    return this.slotRepo.listForCompanyBetween(companyId, fromDate, toDate);
  }

  async createSlot(
    companyId: number,
    jobPostingId: number,
    input: CreateSlotInput,
  ): Promise<InterviewSlot> {
    await this.assertJobOwnership(companyId, jobPostingId);
    if (input.endsAt.getTime() <= input.startsAt.getTime()) {
      throw new BadRequestException("Slot end time must be after start time");
    }
    return this.slotRepo.create({
      companyId,
      jobPostingId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      locationLabel: input.locationLabel ?? null,
      locationAddress: input.locationAddress ?? null,
      locationLat: input.locationLat ?? null,
      locationLng: input.locationLng ?? null,
      capacity: input.capacity ?? 1,
      notes: input.notes ?? null,
      isCancelled: false,
    });
  }

  async deleteSlot(companyId: number, slotId: number): Promise<{ deleted: boolean }> {
    const slot = await this.slotRepo.findByIdForCompanyWithBookings(slotId, companyId);
    if (!slot) throw new NotFoundException("Slot not found");
    const activeBookings = (slot.bookings ?? []).filter(
      (b) => b.status === InterviewBookingStatus.BOOKED,
    );
    if (activeBookings.length > 0) {
      throw new ConflictException(
        "Slot has an active booking. Cancel the booking before deleting the slot.",
      );
    }
    await this.slotRepo.deleteById(slotId);
    return { deleted: true };
  }

  async sendInviteToCandidate(
    companyId: number,
    candidateId: number,
  ): Promise<{ sent: boolean; bookingLink: string }> {
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);
    if (!candidate) throw new NotFoundException("Candidate not found");
    const jobPosting = candidate.jobPosting;
    if (!jobPosting || jobPosting.companyId !== companyId) {
      throw new ForbiddenException("Candidate does not belong to your company");
    }
    if (
      candidate.status !== CandidateStatus.SHORTLISTED &&
      candidate.status !== CandidateStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        "Candidate must be shortlisted or accepted before sending an interview invite.",
      );
    }
    if (!candidate.email) {
      throw new BadRequestException("Candidate has no email address on file.");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = now().plus({ days: INVITE_TOKEN_TTL_DAYS }).toJSDate();
    await this.inviteRepo.create({
      candidateId: candidate.id,
      jobPostingId: jobPosting.id,
      token,
      expiresAt,
    });

    const bookingLink = this.bookingLinkFor(token);
    const companyName = await this.companyName(companyId);

    const sent = await this.emailTemplateService.renderAndSend({
      companyId,
      kind: CvEmailTemplateKind.INTERVIEW_INVITE,
      to: candidate.email,
      vars: {
        candidateName: candidate.name || "Applicant",
        jobTitle: jobPosting.title,
        companyName,
        bookingLink,
      },
    });

    return { sent, bookingLink };
  }

  async lookupByToken(token: string): Promise<{
    invite: InterviewInvite;
    candidate: Candidate;
    job: JobPosting;
    slots: InterviewSlot[];
    currentBooking: InterviewBooking | null;
  }> {
    const invite = await this.inviteRepo.findByToken(token);
    if (!invite) throw new NotFoundException("Invitation link not found");
    if (fromJSDate(invite.expiresAt).toMillis() < nowMillis()) {
      throw new ForbiddenException(
        "This invitation link has expired. Ask the company for a new one.",
      );
    }

    const candidate = await this.candidateRepo.findByIdWithJobPosting(invite.candidateId);
    if (!candidate) throw new NotFoundException("Candidate not found");
    const jobPosting = candidate.jobPosting;
    if (!jobPosting) throw new NotFoundException("Candidate is not linked to a job posting");

    const slots = await this.slotRepo.listOpenForJob(invite.jobPostingId);

    const currentBooking = await this.bookingRepo.findActiveForCandidateWithSlot(
      invite.candidateId,
    );

    return {
      invite,
      candidate,
      job: jobPosting,
      slots,
      currentBooking,
    };
  }

  async bookByToken(token: string, slotId: number): Promise<InterviewBooking> {
    const { invite, candidate, slots, currentBooking } = await this.lookupByToken(token);

    const slot = slots.find((s) => s.id === slotId);
    if (!slot) throw new NotFoundException("Slot not found for this job posting");

    if (currentBooking && currentBooking.status === InterviewBookingStatus.BOOKED) {
      currentBooking.status = InterviewBookingStatus.CANCELLED;
      currentBooking.cancelledAt = now().toJSDate();
      currentBooking.cancelReason = "Candidate rebooked to another slot";
      await this.bookingRepo.save(currentBooking);
    }

    try {
      const saved = await this.bookingRepo.create({
        slotId: slot.id,
        candidateId: candidate.id,
        status: InterviewBookingStatus.BOOKED,
        bookedAt: now().toJSDate(),
      });

      invite.usedAt = now().toJSDate();
      await this.inviteRepo.save(invite);

      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("unique")) {
        throw new ConflictException("This slot was just taken — please pick another.");
      }
      throw err;
    }
  }

  async cancelByToken(token: string, bookingId: number): Promise<{ cancelled: boolean }> {
    const { candidate } = await this.lookupByToken(token);
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking || booking.candidateId !== candidate.id) {
      throw new NotFoundException("Booking not found");
    }
    booking.status = InterviewBookingStatus.CANCELLED;
    booking.cancelledAt = now().toJSDate();
    booking.cancelReason = "Cancelled by candidate";
    await this.bookingRepo.save(booking);
    return { cancelled: true };
  }

  async bookingsForCandidate(candidateId: number): Promise<InterviewBooking[]> {
    return this.bookingRepo.bookingsForCandidate(candidateId);
  }

  async bookingsForIndividualByEmail(email: string): Promise<InterviewBooking[]> {
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return [];
    return this.bookingRepo.bookingsForCandidates(candidates.map((c) => c.id));
  }

  async openInvitesForIndividualByEmail(email: string): Promise<InterviewInvite[]> {
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return [];
    const invites = await this.inviteRepo.findForCandidatesWithJob(candidates.map((c) => c.id));
    const nowMs = nowMillis();
    return invites.filter((i) => fromJSDate(i.expiresAt).toMillis() > nowMs);
  }

  private bookingLinkFor(token: string): string {
    const configured = this.configService.get<string>("FRONTEND_URL");
    const baseUrl = configured ? configured.replace(/\/$/, "") : "https://annix-orbit.annix.co.za";
    return `${baseUrl}/annix-orbit/interview-booking/${token}`;
  }

  private async assertJobOwnership(companyId: number, jobPostingId: number): Promise<void> {
    const job = await this.jobPostingRepo.findByIdForCompany(jobPostingId, companyId);
    if (!job) throw new NotFoundException("Job posting not found");
  }

  private async companyName(companyId: number): Promise<string> {
    const company = await this.companyRepo.findById(companyId);
    return company?.name ?? "the hiring team";
  }
}
