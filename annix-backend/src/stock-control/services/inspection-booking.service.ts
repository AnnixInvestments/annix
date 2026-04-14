import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Not, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { InspectionBooking } from "../entities/inspection-booking.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { BackgroundStepService } from "./background-step.service";
import { CompanyEmailService } from "./company-email.service";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

interface CreateBookingInput {
  inspectionDate: string;
  startTime: string;
  endTime: string;
  inspectorEmail: string;
  inspectorName: string | null;
  notes: string | null;
}

interface ProposeInput {
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  note: string | null;
}

@Injectable()
export class InspectionBookingService {
  private readonly logger = new Logger(InspectionBookingService.name);

  constructor(
    @InjectRepository(InspectionBooking)
    private readonly bookingRepo: Repository<InspectionBooking>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly emailService: CompanyEmailService,
    private readonly backgroundStepService: BackgroundStepService,
  ) {}

  async createBooking(
    companyId: number,
    jobCardId: number,
    input: CreateBookingInput,
    user: UserContext,
  ): Promise<InspectionBooking> {
    const overlapping = await this.findOverlapping(
      companyId,
      input.inspectionDate,
      input.startTime,
      input.endTime,
      null,
    );

    if (overlapping.length > 0) {
      throw new BadRequestException(
        `Time slot overlaps with an existing booking (${overlapping[0].startTime} - ${overlapping[0].endTime})`,
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = now().plus({ days: 30 }).toJSDate();

    const booking = this.bookingRepo.create({
      companyId,
      jobCardId,
      inspectionDate: input.inspectionDate,
      startTime: input.startTime,
      endTime: input.endTime,
      inspectorEmail: input.inspectorEmail,
      inspectorName: input.inspectorName,
      notes: input.notes,
      status: "booked",
      bookedById: user.id,
      bookedByName: user.name,
      responseToken: token,
      tokenExpiresAt: expiresAt,
    });

    const saved = await this.bookingRepo.save(booking);

    this.logger.log(
      `Inspection booked for job card ${jobCardId} on ${input.inspectionDate} ${input.startTime}-${input.endTime} by ${user.name}`,
    );

    await this.sendBookingEmail(saved);

    return saved;
  }

  async bookingsForJobCard(companyId: number, jobCardId: number): Promise<InspectionBooking[]> {
    return this.bookingRepo.find({
      where: { companyId, jobCardId },
      order: { inspectionDate: "DESC", startTime: "DESC" },
    });
  }

  async bookingsForDateRange(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InspectionBooking[]> {
    return this.bookingRepo.find({
      where: {
        companyId,
        inspectionDate: Between(startDate, endDate),
      },
      relations: ["jobCard"],
      order: { inspectionDate: "ASC", startTime: "ASC" },
    });
  }

  async bookedSlotsForDate(companyId: number, date: string): Promise<InspectionBooking[]> {
    return this.bookingRepo.find({
      where: {
        companyId,
        inspectionDate: date,
        status: Not("cancelled"),
      },
      order: { startTime: "ASC" },
    });
  }

  async completeInspection(
    companyId: number,
    bookingId: number,
    user: UserContext,
    notes: string | null,
  ): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, companyId },
    });

    if (!booking) {
      throw new NotFoundException(`Inspection booking ${bookingId} not found`);
    }

    if (booking.status === "completed") {
      throw new BadRequestException("Inspection already completed");
    }

    if (booking.status === "cancelled") {
      throw new BadRequestException("Cannot complete a cancelled inspection");
    }

    booking.status = "completed";
    booking.completedAt = now().toJSDate();
    booking.completedById = user.id;
    booking.completedByName = user.name;
    if (notes) {
      booking.notes = booking.notes ? `${booking.notes}\n\nCompletion: ${notes}` : notes;
    }

    const saved = await this.bookingRepo.save(booking);

    this.logger.log(
      `Inspection ${bookingId} completed for job card ${booking.jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async cancelBooking(
    companyId: number,
    bookingId: number,
    user: UserContext,
  ): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, companyId },
    });

    if (!booking) {
      throw new NotFoundException(`Inspection booking ${bookingId} not found`);
    }

    if (booking.status === "completed") {
      throw new BadRequestException("Cannot cancel a completed inspection");
    }

    booking.status = "cancelled";

    const saved = await this.bookingRepo.save(booking);

    this.logger.log(
      `Inspection ${bookingId} cancelled for job card ${booking.jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async bookingByToken(token: string): Promise<{
    booking: InspectionBooking;
    jobCard: { id: number; jobName: string | null; jcNumber: string | null } | null;
    company: { name: string };
  }> {
    const booking = await this.bookingRepo.findOne({ where: { responseToken: token } });
    if (!booking) {
      throw new NotFoundException("Response link not found or invalid");
    }
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < now().toJSDate()) {
      throw new BadRequestException("This response link has expired");
    }
    const jobCard = await this.jobCardRepo.findOne({ where: { id: booking.jobCardId } });
    const company = await this.companyRepo.findOne({ where: { id: booking.companyId } });
    return {
      booking,
      jobCard: jobCard
        ? {
            id: jobCard.id,
            jobName: jobCard.jobName || null,
            jcNumber: jobCard.jcNumber || null,
          }
        : null,
      company: { name: company?.name || "Stock Control" },
    };
  }

  async respondAccept(token: string): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({ where: { responseToken: token } });
    if (!booking) {
      throw new NotFoundException("Response link not found or invalid");
    }
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < now().toJSDate()) {
      throw new BadRequestException("This response link has expired");
    }
    if (booking.status === "cancelled") {
      throw new BadRequestException("This inspection has been cancelled");
    }
    if (booking.status === "accepted" || booking.status === "completed") {
      return booking;
    }

    booking.status = "accepted";
    booking.respondedAt = now().toJSDate();
    booking.proposedDate = null;
    booking.proposedStartTime = null;
    booking.proposedEndTime = null;
    booking.proposedNote = null;
    booking.proposedAt = null;
    const saved = await this.bookingRepo.save(booking);

    await this.completeInspectionStep(saved);
    await this.notifyBookerAccepted(saved);
    return saved;
  }

  async respondPropose(token: string, input: ProposeInput): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({ where: { responseToken: token } });
    if (!booking) {
      throw new NotFoundException("Response link not found or invalid");
    }
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < now().toJSDate()) {
      throw new BadRequestException("This response link has expired");
    }
    if (booking.status === "cancelled") {
      throw new BadRequestException("This inspection has been cancelled");
    }
    if (booking.status === "completed") {
      throw new BadRequestException("This inspection has already been completed");
    }

    booking.status = "proposed";
    booking.respondedAt = now().toJSDate();
    booking.proposedDate = input.proposedDate;
    booking.proposedStartTime = input.proposedStartTime;
    booking.proposedEndTime = input.proposedEndTime;
    booking.proposedNote = input.note;
    booking.proposedAt = now().toJSDate();
    const saved = await this.bookingRepo.save(booking);

    await this.notifyBookerProposed(saved);
    return saved;
  }

  async acceptProposal(
    companyId: number,
    bookingId: number,
    user: UserContext,
  ): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, companyId },
    });
    if (!booking) {
      throw new NotFoundException(`Inspection booking ${bookingId} not found`);
    }
    if (booking.status !== "proposed") {
      throw new BadRequestException("No proposed time to accept");
    }
    if (!booking.proposedDate || !booking.proposedStartTime || !booking.proposedEndTime) {
      throw new BadRequestException("Proposed time is incomplete");
    }

    booking.inspectionDate = booking.proposedDate;
    booking.startTime = booking.proposedStartTime;
    booking.endTime = booking.proposedEndTime;
    booking.status = "accepted";
    booking.respondedAt = now().toJSDate();
    booking.proposedDate = null;
    booking.proposedStartTime = null;
    booking.proposedEndTime = null;
    booking.proposedNote = null;
    booking.proposedAt = null;

    const saved = await this.bookingRepo.save(booking);

    await this.completeInspectionStep(saved);
    await this.notifyInspectorAccepted(saved, user);

    this.logger.log(
      `Proposed time accepted for booking ${bookingId} by ${user.name}; step completion triggered`,
    );

    return saved;
  }

  async rejectProposal(
    companyId: number,
    bookingId: number,
    user: UserContext,
  ): Promise<InspectionBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, companyId },
    });
    if (!booking) {
      throw new NotFoundException(`Inspection booking ${bookingId} not found`);
    }
    if (booking.status !== "proposed") {
      throw new BadRequestException("No proposed time to reject");
    }

    booking.status = "booked";
    booking.proposedDate = null;
    booking.proposedStartTime = null;
    booking.proposedEndTime = null;
    booking.proposedNote = null;
    booking.proposedAt = null;
    booking.respondedAt = now().toJSDate();

    const saved = await this.bookingRepo.save(booking);

    this.logger.log(
      `Proposed time rejected for booking ${bookingId} by ${user.name}; returning to booked`,
    );

    return saved;
  }

  private async completeInspectionStep(booking: InspectionBooking): Promise<void> {
    try {
      await this.backgroundStepService.completeStep(
        booking.companyId,
        booking.jobCardId,
        "book_3rd_party_inspections",
        {
          id: booking.bookedById || 0,
          companyId: booking.companyId,
          name: booking.bookedByName || "Inspector Acceptance",
        },
        `Inspection accepted by ${booking.inspectorName || booking.inspectorEmail}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to auto-complete book_3rd_party_inspections for job card ${booking.jobCardId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async sendBookingEmail(booking: InspectionBooking): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({ where: { id: booking.jobCardId } });
    const company = await this.companyRepo.findOne({ where: { id: booking.companyId } });
    const baseUrl = this.frontendBaseUrl();
    const respondUrl = `${baseUrl}/stock-control/inspections/respond/${booking.responseToken}`;
    const companyName = company?.name || "Stock Control";
    const jobRef = jobCard?.jcNumber || (jobCard ? `JC-${jobCard.id}` : "");
    const jobName = jobCard?.jobName || "";

    const subject = `Inspection Booking Request - ${jobRef} ${jobName}`.trim();
    const inspectorGreeting = booking.inspectorName ? `Hi ${booking.inspectorName},` : "Hello,";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
  <h2 style="color:#0f766e">${companyName} - Inspection Booking</h2>
  <p>${inspectorGreeting}</p>
  <p><strong>${booking.bookedByName || "Our QA team"}</strong> has booked a third-party inspection and would like to confirm the following slot with you:</p>
  <table style="border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Job</strong></td><td style="padding:6px 12px">${jobRef}${jobName ? ` - ${jobName}` : ""}</td></tr>
    <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Date</strong></td><td style="padding:6px 12px">${booking.inspectionDate}</td></tr>
    <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Time</strong></td><td style="padding:6px 12px">${booking.startTime} - ${booking.endTime}</td></tr>
    ${booking.notes ? `<tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Notes</strong></td><td style="padding:6px 12px">${this.escapeHtml(booking.notes)}</td></tr>` : ""}
  </table>
  <p>Please click below to either accept this slot or propose an alternative time:</p>
  <p style="margin:24px 0">
    <a href="${respondUrl}" style="background:#0f766e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600">Respond to Booking</a>
  </p>
  <p style="color:#6b7280;font-size:12px">If the button does not work, copy and paste this link:<br/>${respondUrl}</p>
  <p style="color:#6b7280;font-size:12px">This link expires in 30 days.</p>
</div>`.trim();

    const text = `${inspectorGreeting}

${booking.bookedByName || "Our QA team"} has booked a third-party inspection for ${jobRef} ${jobName} on ${booking.inspectionDate} from ${booking.startTime} to ${booking.endTime}.

Please accept or propose a new time here:
${respondUrl}

This link expires in 30 days.`;

    const sent = await this.emailService.sendEmail(booking.companyId, {
      to: booking.inspectorEmail,
      subject,
      html,
      text,
    });

    if (!sent) {
      this.logger.warn(`Inspection booking email to ${booking.inspectorEmail} reported not sent`);
    }
  }

  private async notifyBookerAccepted(booking: InspectionBooking): Promise<void> {
    const bookerEmail = await this.bookerEmail(booking);
    if (!bookerEmail) return;
    const jobCard = await this.jobCardRepo.findOne({ where: { id: booking.jobCardId } });
    const jobRef = jobCard?.jcNumber || (jobCard ? `JC-${jobCard.id}` : "");

    await this.emailService.sendEmail(booking.companyId, {
      to: bookerEmail,
      subject: `Inspection Accepted - ${jobRef}`,
      html: `<p><strong>${booking.inspectorName || booking.inspectorEmail}</strong> has accepted the inspection slot on <strong>${booking.inspectionDate}</strong> at <strong>${booking.startTime} - ${booking.endTime}</strong>.</p><p>The workflow step has been marked complete.</p>`,
      text: `${booking.inspectorName || booking.inspectorEmail} accepted the inspection on ${booking.inspectionDate} at ${booking.startTime} - ${booking.endTime}. Step marked complete.`,
    });
  }

  private async notifyBookerProposed(booking: InspectionBooking): Promise<void> {
    const bookerEmail = await this.bookerEmail(booking);
    if (!bookerEmail) return;
    const jobCard = await this.jobCardRepo.findOne({ where: { id: booking.jobCardId } });
    const jobRef = jobCard?.jcNumber || (jobCard ? `JC-${jobCard.id}` : "");
    const baseUrl = this.frontendBaseUrl();
    const jobCardUrl = `${baseUrl}/stock-control/portal/job-cards/${booking.jobCardId}#quality`;

    await this.emailService.sendEmail(booking.companyId, {
      to: bookerEmail,
      subject: `New Time Proposed - Inspection for ${jobRef}`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px">
  <p><strong>${booking.inspectorName || booking.inspectorEmail}</strong> has proposed a new time for the inspection:</p>
  <p><strong>Original:</strong> ${booking.inspectionDate} ${booking.startTime} - ${booking.endTime}</p>
  <p><strong>Proposed:</strong> ${booking.proposedDate} ${booking.proposedStartTime} - ${booking.proposedEndTime}</p>
  ${booking.proposedNote ? `<p><strong>Note from inspector:</strong> ${this.escapeHtml(booking.proposedNote)}</p>` : ""}
  <p><a href="${jobCardUrl}" style="background:#0f766e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px">Review in Job Card</a></p>
</div>`.trim(),
      text: `${booking.inspectorName || booking.inspectorEmail} proposed a new inspection time: ${booking.proposedDate} ${booking.proposedStartTime}-${booking.proposedEndTime}. Review at ${jobCardUrl}`,
    });
  }

  private async notifyInspectorAccepted(
    booking: InspectionBooking,
    user: UserContext,
  ): Promise<void> {
    await this.emailService.sendEmail(booking.companyId, {
      to: booking.inspectorEmail,
      subject: "Inspection Time Confirmed",
      html: `<p>Your proposed time has been accepted by <strong>${user.name}</strong>.</p><p><strong>Confirmed:</strong> ${booking.inspectionDate} at ${booking.startTime} - ${booking.endTime}</p>`,
      text: `Your proposed time was accepted by ${user.name}. Confirmed: ${booking.inspectionDate} at ${booking.startTime} - ${booking.endTime}.`,
    });
  }

  private async bookerEmail(booking: InspectionBooking): Promise<string | null> {
    const company = await this.companyRepo.findOne({ where: { id: booking.companyId } });
    const notifyEmails = company?.notificationEmails || [];
    if (notifyEmails.length > 0) return notifyEmails[0];
    return null;
  }

  private frontendBaseUrl(): string {
    const envUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN;
    if (envUrl) return envUrl.replace(/\/$/, "");
    return "https://annix.co.za";
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private async findOverlapping(
    companyId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId: number | null,
  ): Promise<InspectionBooking[]> {
    const allBookings = await this.bookingRepo.find({
      where: {
        companyId,
        inspectionDate: date,
        status: Not("cancelled"),
      },
    });

    return allBookings.filter((existing) => {
      if (excludeBookingId && existing.id === excludeBookingId) {
        return false;
      }
      return existing.startTime < endTime && existing.endTime > startTime;
    });
  }
}
