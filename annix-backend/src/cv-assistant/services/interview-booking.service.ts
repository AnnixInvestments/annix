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
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { CvEmailTemplateKind } from "../entities/cv-assistant-email-template.entity";
import { InterviewBooking, InterviewBookingStatus } from "../entities/interview-booking.entity";
import { InterviewInvite } from "../entities/interview-invite.entity";
import { InterviewSlot } from "../entities/interview-slot.entity";
import { JobPosting } from "../entities/job-posting.entity";
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
    @InjectRepository(InterviewSlot)
    private readonly slotRepo: Repository<InterviewSlot>,
    @InjectRepository(InterviewBooking)
    private readonly bookingRepo: Repository<InterviewBooking>,
    @InjectRepository(InterviewInvite)
    private readonly inviteRepo: Repository<InterviewInvite>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async listSlotsForJob(companyId: number, jobPostingId: number): Promise<InterviewSlot[]> {
    await this.assertJobOwnership(companyId, jobPostingId);
    return this.slotRepo.find({
      where: { companyId, jobPostingId },
      relations: ["bookings", "bookings.candidate"],
      order: { startsAt: "ASC" },
    });
  }

  async listSlotsForCompany(companyId: number, fromIso: string | null): Promise<InterviewSlot[]> {
    const fromDate = fromIso ? new Date(fromIso) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = new Date(fromDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.slotRepo.find({
      where: { companyId, startsAt: Between(fromDate, toDate) },
      relations: ["jobPosting", "bookings", "bookings.candidate"],
      order: { startsAt: "ASC" },
    });
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
    const slot = this.slotRepo.create({
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
    return this.slotRepo.save(slot);
  }

  async deleteSlot(companyId: number, slotId: number): Promise<{ deleted: boolean }> {
    const slot = await this.slotRepo.findOne({
      where: { id: slotId, companyId },
      relations: ["bookings"],
    });
    if (!slot) throw new NotFoundException("Slot not found");
    const activeBookings = (slot.bookings ?? []).filter(
      (b) => b.status === InterviewBookingStatus.BOOKED,
    );
    if (activeBookings.length > 0) {
      throw new ConflictException(
        "Slot has an active booking. Cancel the booking before deleting the slot.",
      );
    }
    await this.slotRepo.delete({ id: slotId });
    return { deleted: true };
  }

  async sendInviteToCandidate(
    companyId: number,
    candidateId: number,
  ): Promise<{ sent: boolean; bookingLink: string }> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    if (candidate.jobPosting.companyId !== companyId) {
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
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const invite = this.inviteRepo.create({
      candidateId: candidate.id,
      jobPostingId: candidate.jobPosting.id,
      token,
      expiresAt,
    });
    await this.inviteRepo.save(invite);

    const bookingLink = this.bookingLinkFor(token);
    const companyName = await this.companyName(companyId);

    const sent = await this.emailTemplateService.renderAndSend({
      companyId,
      kind: CvEmailTemplateKind.INTERVIEW_INVITE,
      to: candidate.email,
      vars: {
        candidateName: candidate.name || "Applicant",
        jobTitle: candidate.jobPosting.title,
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
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) throw new NotFoundException("Invitation link not found");
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException(
        "This invitation link has expired. Ask the company for a new one.",
      );
    }

    const candidate = await this.candidateRepo.findOne({
      where: { id: invite.candidateId },
      relations: ["jobPosting"],
    });
    if (!candidate) throw new NotFoundException("Candidate not found");

    const slots = await this.slotRepo.find({
      where: { jobPostingId: invite.jobPostingId, isCancelled: false },
      relations: ["bookings"],
      order: { startsAt: "ASC" },
    });

    const currentBooking = await this.bookingRepo.findOne({
      where: {
        candidateId: invite.candidateId,
        status: InterviewBookingStatus.BOOKED,
      },
      relations: ["slot"],
    });

    return {
      invite,
      candidate,
      job: candidate.jobPosting,
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
      const booking = this.bookingRepo.create({
        slotId: slot.id,
        candidateId: candidate.id,
        status: InterviewBookingStatus.BOOKED,
        bookedAt: now().toJSDate(),
      });
      const saved = await this.bookingRepo.save(booking);

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
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
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
    return this.bookingRepo.find({
      where: { candidateId, status: InterviewBookingStatus.BOOKED },
      relations: ["slot", "slot.jobPosting", "slot.company"],
      order: { bookedAt: "ASC" },
    });
  }

  async bookingsForIndividualByEmail(email: string): Promise<InterviewBooking[]> {
    const candidates = await this.candidateRepo.find({ where: { email } });
    if (candidates.length === 0) return [];
    return this.bookingRepo.find({
      where: {
        candidateId: In(candidates.map((c) => c.id)),
        status: InterviewBookingStatus.BOOKED,
        cancelledAt: IsNull(),
      },
      relations: ["slot", "slot.jobPosting"],
      order: { bookedAt: "ASC" },
    });
  }

  private bookingLinkFor(token: string): string {
    const baseUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return `${baseUrl}/cv-assistant/interview-booking/${token}`;
  }

  private async assertJobOwnership(companyId: number, jobPostingId: number): Promise<void> {
    const job = await this.jobPostingRepo.findOne({
      where: { id: jobPostingId, companyId },
    });
    if (!job) throw new NotFoundException("Job posting not found");
  }

  private async companyName(companyId: number): Promise<string> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    return company?.name ?? "the hiring team";
  }
}
