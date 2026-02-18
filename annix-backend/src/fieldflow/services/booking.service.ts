import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { fromISO, now } from "../../lib/datetime";
import { User } from "../../user/entities/user.entity";
import {
  AvailableSlotDto,
  BookingConfirmationDto,
  BookSlotDto,
  CreateBookingLinkDto,
  PublicBookingLinkDto,
  UpdateBookingLinkDto,
} from "../dto/booking.dto";
import { BookingLink, Meeting, MeetingStatus } from "../entities";

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(BookingLink)
    private readonly bookingLinkRepo: Repository<BookingLink>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createLink(userId: number, dto: CreateBookingLinkDto): Promise<BookingLink> {
    const link = this.bookingLinkRepo.create({
      userId,
      name: dto.name,
      meetingDurationMinutes: dto.meetingDurationMinutes ?? 30,
      bufferBeforeMinutes: dto.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: dto.bufferAfterMinutes ?? 0,
      availableDays: dto.availableDays ?? "1,2,3,4,5",
      availableStartHour: dto.availableStartHour ?? 8,
      availableEndHour: dto.availableEndHour ?? 17,
      maxDaysAhead: dto.maxDaysAhead ?? 30,
      customQuestions: dto.customQuestions ?? null,
      meetingType: dto.meetingType,
      location: dto.location ?? null,
      description: dto.description ?? null,
    });

    const saved = await this.bookingLinkRepo.save(link);
    this.logger.log(`Booking link created: ${saved.id} (slug: ${saved.slug}) by user ${userId}`);
    return saved;
  }

  async updateLink(
    userId: number,
    linkId: number,
    dto: UpdateBookingLinkDto,
  ): Promise<BookingLink> {
    const link = await this.bookingLinkRepo.findOne({
      where: { id: linkId, userId },
    });

    if (!link) {
      throw new NotFoundException(`Booking link ${linkId} not found`);
    }

    if (dto.name !== undefined) link.name = dto.name;
    if (dto.meetingDurationMinutes !== undefined)
      link.meetingDurationMinutes = dto.meetingDurationMinutes;
    if (dto.bufferBeforeMinutes !== undefined) link.bufferBeforeMinutes = dto.bufferBeforeMinutes;
    if (dto.bufferAfterMinutes !== undefined) link.bufferAfterMinutes = dto.bufferAfterMinutes;
    if (dto.availableDays !== undefined) link.availableDays = dto.availableDays;
    if (dto.availableStartHour !== undefined) link.availableStartHour = dto.availableStartHour;
    if (dto.availableEndHour !== undefined) link.availableEndHour = dto.availableEndHour;
    if (dto.maxDaysAhead !== undefined) link.maxDaysAhead = dto.maxDaysAhead;
    if (dto.isActive !== undefined) link.isActive = dto.isActive;
    if (dto.customQuestions !== undefined) link.customQuestions = dto.customQuestions ?? null;
    if (dto.meetingType !== undefined) link.meetingType = dto.meetingType;
    if (dto.location !== undefined) link.location = dto.location ?? null;
    if (dto.description !== undefined) link.description = dto.description ?? null;

    return this.bookingLinkRepo.save(link);
  }

  async deleteLink(userId: number, linkId: number): Promise<void> {
    const link = await this.bookingLinkRepo.findOne({
      where: { id: linkId, userId },
    });

    if (!link) {
      throw new NotFoundException(`Booking link ${linkId} not found`);
    }

    await this.bookingLinkRepo.remove(link);
    this.logger.log(`Booking link deleted: ${linkId} by user ${userId}`);
  }

  async userLinks(userId: number): Promise<BookingLink[]> {
    return this.bookingLinkRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async linkById(userId: number, linkId: number): Promise<BookingLink> {
    const link = await this.bookingLinkRepo.findOne({
      where: { id: linkId, userId },
    });

    if (!link) {
      throw new NotFoundException(`Booking link ${linkId} not found`);
    }

    return link;
  }

  async publicLinkDetails(slug: string): Promise<PublicBookingLinkDto> {
    const link = await this.bookingLinkRepo.findOne({
      where: { slug, isActive: true },
      relations: ["user"],
    });

    if (!link) {
      throw new NotFoundException("Booking link not found or inactive");
    }

    return {
      slug: link.slug,
      name: link.name,
      meetingDurationMinutes: link.meetingDurationMinutes,
      availableDays: link.availableDays,
      availableStartHour: link.availableStartHour,
      availableEndHour: link.availableEndHour,
      maxDaysAhead: link.maxDaysAhead,
      customQuestions: link.customQuestions,
      meetingType: link.meetingType,
      location: link.location,
      description: link.description,
      hostName:
        [link.user.firstName, link.user.lastName].filter(Boolean).join(" ") || link.user.email,
    };
  }

  async availableSlots(slug: string, date: string): Promise<AvailableSlotDto[]> {
    const link = await this.bookingLinkRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!link) {
      throw new NotFoundException("Booking link not found or inactive");
    }

    const targetDate = fromISO(date);
    const today = now().startOf("day");
    const maxDate = today.plus({ days: link.maxDaysAhead });

    if (targetDate < today || targetDate > maxDate) {
      return [];
    }

    const dayOfWeek = targetDate.weekday % 7;
    const availableDays = link.availableDays.split(",").map((d) => parseInt(d.trim(), 10));

    if (!availableDays.includes(dayOfWeek)) {
      return [];
    }

    const existingMeetings = await this.meetingRepo.find({
      where: {
        salesRepId: link.userId,
        scheduledStart: Between(
          targetDate.startOf("day").toJSDate(),
          targetDate.endOf("day").toJSDate(),
        ),
        status: MeetingStatus.SCHEDULED,
      },
      select: ["scheduledStart", "scheduledEnd"],
    });

    const busySlots = existingMeetings.map((m) => ({
      start: fromISO(m.scheduledStart.toISOString()),
      end: fromISO(m.scheduledEnd.toISOString()),
    }));

    const slots: AvailableSlotDto[] = [];
    const slotDuration = link.meetingDurationMinutes;
    const bufferBefore = link.bufferBeforeMinutes;
    const bufferAfter = link.bufferAfterMinutes;

    let currentSlotStart = targetDate.set({
      hour: link.availableStartHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const dayEnd = targetDate.set({
      hour: link.availableEndHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const currentTime = now();

    while (currentSlotStart.plus({ minutes: slotDuration }) <= dayEnd) {
      const slotEnd = currentSlotStart.plus({ minutes: slotDuration });

      const slotWithBuffer = {
        start: currentSlotStart.minus({ minutes: bufferBefore }),
        end: slotEnd.plus({ minutes: bufferAfter }),
      };

      const isAvailable =
        currentSlotStart > currentTime &&
        !busySlots.some(
          (busy) =>
            (slotWithBuffer.start >= busy.start && slotWithBuffer.start < busy.end) ||
            (slotWithBuffer.end > busy.start && slotWithBuffer.end <= busy.end) ||
            (slotWithBuffer.start <= busy.start && slotWithBuffer.end >= busy.end),
        );

      if (isAvailable) {
        slots.push({
          startTime: currentSlotStart.toISO()!,
          endTime: slotEnd.toISO()!,
        });
      }

      currentSlotStart = currentSlotStart.plus({ minutes: 30 });
    }

    return slots;
  }

  async bookSlot(slug: string, dto: BookSlotDto): Promise<BookingConfirmationDto> {
    const link = await this.bookingLinkRepo.findOne({
      where: { slug, isActive: true },
      relations: ["user"],
    });

    if (!link) {
      throw new NotFoundException("Booking link not found or inactive");
    }

    const startTime = fromISO(dto.startTime);
    const endTime = startTime.plus({ minutes: link.meetingDurationMinutes });

    const conflictingMeeting = await this.meetingRepo.findOne({
      where: {
        salesRepId: link.userId,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: Between(
          startTime.minus({ minutes: link.bufferBeforeMinutes }).toJSDate(),
          endTime.plus({ minutes: link.bufferAfterMinutes }).toJSDate(),
        ),
      },
    });

    if (conflictingMeeting) {
      throw new BadRequestException("This time slot is no longer available");
    }

    const customAnswersText = dto.customAnswers
      ? Object.entries(dto.customAnswers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
      : "";

    const meeting = this.meetingRepo.create({
      salesRepId: link.userId,
      title: `Meeting with ${dto.name}`,
      description: [
        `Booked via: ${link.name}`,
        `Contact: ${dto.email}`,
        dto.notes ? `Notes: ${dto.notes}` : null,
        customAnswersText ? `\nCustom Answers:\n${customAnswersText}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      meetingType: link.meetingType,
      status: MeetingStatus.SCHEDULED,
      scheduledStart: startTime.toJSDate(),
      scheduledEnd: endTime.toJSDate(),
      location: link.location,
      attendees: [dto.email],
    });

    const saved = await this.meetingRepo.save(meeting);

    this.logger.log(`Meeting booked via link ${link.id}: meeting ${saved.id} by ${dto.email}`);

    return {
      meetingId: saved.id,
      title: saved.title,
      startTime: startTime.toISO()!,
      endTime: endTime.toISO()!,
      meetingType: link.meetingType,
      location: link.location,
      hostName:
        [link.user.firstName, link.user.lastName].filter(Boolean).join(" ") || link.user.email,
      hostEmail: link.user.email,
    };
  }
}
