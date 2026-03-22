import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Not, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { InspectionBooking } from "../entities/inspection-booking.entity";

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

@Injectable()
export class InspectionBookingService {
  private readonly logger = new Logger(InspectionBookingService.name);

  constructor(
    @InjectRepository(InspectionBooking)
    private readonly bookingRepo: Repository<InspectionBooking>,
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
    });

    const saved = await this.bookingRepo.save(booking);

    this.logger.log(
      `Inspection booked for job card ${jobCardId} on ${input.inspectionDate} ${input.startTime}-${input.endTime} by ${user.name}`,
    );

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
