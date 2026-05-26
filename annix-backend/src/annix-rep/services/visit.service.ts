import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { fromISO, now } from "../../lib/datetime";
import { CheckInDto, CheckOutDto, CreateVisitDto, UpdateVisitDto } from "../dto";
import { Visit, VisitType } from "../entities";
import { ProspectRepository } from "../prospect.repository";
import { VisitRepository } from "../visit.repository";

@Injectable()
export class VisitService {
  private readonly logger = new Logger(VisitService.name);

  constructor(
    private readonly visitRepo: VisitRepository,
    private readonly prospectRepo: ProspectRepository,
  ) {}

  async create(salesRepId: number, dto: CreateVisitDto): Promise<Visit> {
    const prospect = await this.prospectRepo.findById(dto.prospectId);

    if (!prospect) {
      throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
    }

    const saved = await this.visitRepo.create({
      prospectId: dto.prospectId,
      salesRepId,
      visitType: dto.visitType ?? VisitType.SCHEDULED,
      scheduledAt: dto.scheduledAt ? fromISO(dto.scheduledAt).toJSDate() : null,
      notes: dto.notes ?? null,
    });
    this.logger.log(`Visit created: ${saved.id} for prospect ${dto.prospectId}`);
    return saved;
  }

  async findAll(salesRepId: number): Promise<Visit[]> {
    return this.visitRepo.findAllForSalesRep(salesRepId);
  }

  async findByProspect(prospectId: number): Promise<Visit[]> {
    return this.visitRepo.findByProspect(prospectId);
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Visit[]> {
    return this.visitRepo.findByDateRange(salesRepId, startDate, endDate);
  }

  async findOne(salesRepId: number, id: number): Promise<Visit> {
    const visit = await this.visitRepo.findOneForSalesRep(salesRepId, id);

    if (!visit) {
      throw new NotFoundException(`Visit ${id} not found`);
    }

    return visit;
  }

  async update(salesRepId: number, id: number, dto: UpdateVisitDto): Promise<Visit> {
    const visit = await this.findOne(salesRepId, id);

    if (dto.visitType != null) visit.visitType = dto.visitType;
    if (dto.scheduledAt != null)
      visit.scheduledAt = dto.scheduledAt ? fromISO(dto.scheduledAt).toJSDate() : null;
    if (dto.startedAt != null)
      visit.startedAt = dto.startedAt ? fromISO(dto.startedAt).toJSDate() : null;
    if (dto.endedAt != null) visit.endedAt = dto.endedAt ? fromISO(dto.endedAt).toJSDate() : null;
    if (dto.outcome != null) visit.outcome = dto.outcome;
    if (dto.notes != null) visit.notes = dto.notes ?? null;
    if (dto.contactMet != null) visit.contactMet = dto.contactMet ?? null;
    if (dto.nextSteps != null) visit.nextSteps = dto.nextSteps ?? null;
    if (dto.followUpDate != null)
      visit.followUpDate = dto.followUpDate ? fromISO(dto.followUpDate).toJSDate() : null;

    return this.visitRepo.save(visit);
  }

  async checkIn(salesRepId: number, id: number, dto: CheckInDto): Promise<Visit> {
    const visit = await this.findOne(salesRepId, id);

    if (visit.startedAt) {
      throw new BadRequestException("Visit has already been checked in");
    }

    visit.startedAt = now().toJSDate();
    visit.checkInLatitude = dto.latitude;
    visit.checkInLongitude = dto.longitude;

    const saved = await this.visitRepo.save(visit);
    this.logger.log(`Visit ${id} checked in at ${dto.latitude}, ${dto.longitude}`);
    return saved;
  }

  async checkOut(salesRepId: number, id: number, dto: CheckOutDto): Promise<Visit> {
    const visit = await this.findOne(salesRepId, id);

    if (!visit.startedAt) {
      throw new BadRequestException("Cannot check out without checking in first");
    }

    if (visit.endedAt) {
      throw new BadRequestException("Visit has already been checked out");
    }

    visit.endedAt = now().toJSDate();
    visit.checkOutLatitude = dto.latitude;
    visit.checkOutLongitude = dto.longitude;
    if (dto.outcome) visit.outcome = dto.outcome;
    if (dto.notes) visit.notes = dto.notes;
    if (dto.contactMet) visit.contactMet = dto.contactMet;
    if (dto.nextSteps) visit.nextSteps = dto.nextSteps;

    const saved = await this.visitRepo.save(visit);
    this.logger.log(`Visit ${id} checked out at ${dto.latitude}, ${dto.longitude}`);
    return saved;
  }

  async startColdCall(
    salesRepId: number,
    prospectId: number,
    latitude: number,
    longitude: number,
  ): Promise<Visit> {
    const prospect = await this.prospectRepo.findById(prospectId);

    if (!prospect) {
      throw new NotFoundException(`Prospect ${prospectId} not found`);
    }

    const saved = await this.visitRepo.create({
      prospectId,
      salesRepId,
      visitType: VisitType.COLD_CALL,
      startedAt: now().toJSDate(),
      checkInLatitude: latitude,
      checkInLongitude: longitude,
    });
    this.logger.log(`Cold call visit started: ${saved.id} for prospect ${prospectId}`);
    return saved;
  }

  async remove(salesRepId: number, id: number): Promise<void> {
    const visit = await this.findOne(salesRepId, id);
    await this.visitRepo.remove(visit);
    this.logger.log(`Visit deleted: ${id}`);
  }

  async todaysSchedule(salesRepId: number): Promise<Visit[]> {
    const today = now().startOf("day").toJSDate();
    const tomorrow = now().plus({ days: 1 }).startOf("day").toJSDate();

    return this.visitRepo.findTodaysSchedule(salesRepId, today, tomorrow);
  }

  async activeVisit(salesRepId: number): Promise<Visit | null> {
    return this.visitRepo.findActive(
      salesRepId,
      now().minus({ hours: 12 }).toJSDate(),
      now().toJSDate(),
    );
  }
}
