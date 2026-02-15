import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { CheckInDto, CheckOutDto, CreateVisitDto, UpdateVisitDto } from "../dto";
import { Prospect, Visit, VisitType } from "../entities";

@Injectable()
export class VisitService {
  private readonly logger = new Logger(VisitService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
  ) {}

  async create(salesRepId: number, dto: CreateVisitDto): Promise<Visit> {
    const prospect = await this.prospectRepo.findOne({
      where: { id: dto.prospectId },
    });

    if (!prospect) {
      throw new NotFoundException(`Prospect ${dto.prospectId} not found`);
    }

    const visit = this.visitRepo.create({
      prospectId: dto.prospectId,
      salesRepId,
      visitType: dto.visitType ?? VisitType.SCHEDULED,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      notes: dto.notes ?? null,
    });

    const saved = await this.visitRepo.save(visit);
    this.logger.log(`Visit created: ${saved.id} for prospect ${dto.prospectId}`);
    return saved;
  }

  async findAll(salesRepId: number): Promise<Visit[]> {
    return this.visitRepo.find({
      where: { salesRepId },
      relations: ["prospect"],
      order: { createdAt: "DESC" },
    });
  }

  async findByProspect(prospectId: number): Promise<Visit[]> {
    return this.visitRepo.find({
      where: { prospectId },
      order: { createdAt: "DESC" },
    });
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Visit[]> {
    return this.visitRepo.find({
      where: {
        salesRepId,
        scheduledAt: Between(startDate, endDate),
      },
      relations: ["prospect"],
      order: { scheduledAt: "ASC" },
    });
  }

  async findOne(salesRepId: number, id: number): Promise<Visit> {
    const visit = await this.visitRepo.findOne({
      where: { id, salesRepId },
      relations: ["prospect"],
    });

    if (!visit) {
      throw new NotFoundException(`Visit ${id} not found`);
    }

    return visit;
  }

  async update(salesRepId: number, id: number, dto: UpdateVisitDto): Promise<Visit> {
    const visit = await this.findOne(salesRepId, id);

    if (dto.visitType !== undefined) visit.visitType = dto.visitType;
    if (dto.scheduledAt !== undefined)
      visit.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.startedAt !== undefined)
      visit.startedAt = dto.startedAt ? new Date(dto.startedAt) : null;
    if (dto.endedAt !== undefined) visit.endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    if (dto.outcome !== undefined) visit.outcome = dto.outcome;
    if (dto.notes !== undefined) visit.notes = dto.notes ?? null;
    if (dto.contactMet !== undefined) visit.contactMet = dto.contactMet ?? null;
    if (dto.nextSteps !== undefined) visit.nextSteps = dto.nextSteps ?? null;
    if (dto.followUpDate !== undefined)
      visit.followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;

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
    const prospect = await this.prospectRepo.findOne({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundException(`Prospect ${prospectId} not found`);
    }

    const visit = this.visitRepo.create({
      prospectId,
      salesRepId,
      visitType: VisitType.COLD_CALL,
      startedAt: now().toJSDate(),
      checkInLatitude: latitude,
      checkInLongitude: longitude,
    });

    const saved = await this.visitRepo.save(visit);
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

    return this.visitRepo.find({
      where: {
        salesRepId,
        scheduledAt: Between(today, tomorrow),
      },
      relations: ["prospect"],
      order: { scheduledAt: "ASC" },
    });
  }

  async activeVisit(salesRepId: number): Promise<Visit | null> {
    return this.visitRepo.findOne({
      where: {
        salesRepId,
        startedAt: Between(now().minus({ hours: 12 }).toJSDate(), now().toJSDate()),
        endedAt: undefined,
      },
      relations: ["prospect"],
    });
  }
}
