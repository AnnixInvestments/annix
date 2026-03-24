import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { DateTime } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { CreateLeaveDto } from "../dto/staff-leave.dto";
import { LeaveType, StaffLeaveRecord } from "../entities/staff-leave-record.entity";

@Injectable()
export class StaffLeaveService {
  constructor(
    @InjectRepository(StaffLeaveRecord)
    private readonly leaveRepo: Repository<StaffLeaveRecord>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async recordsForMonth(
    companyId: number,
    year: number,
    month: number,
  ): Promise<StaffLeaveRecord[]> {
    const monthStart = DateTime.fromObject({ year, month, day: 1 }).toISODate();
    const monthEnd = DateTime.fromObject({ year, month, day: 1 }).endOf("month").toISODate();

    if (!monthStart || !monthEnd) {
      throw new BadRequestException("Invalid year/month");
    }

    return this.leaveRepo.find({
      where: {
        companyId,
        startDate: LessThanOrEqual(monthEnd),
        endDate: MoreThanOrEqual(monthStart),
      },
      relations: ["user"],
      order: { startDate: "ASC" },
    });
  }

  async recordsForUser(companyId: number, userId: number): Promise<StaffLeaveRecord[]> {
    return this.leaveRepo.find({
      where: { companyId, userId },
      order: { startDate: "DESC" },
    });
  }

  async createRecord(
    companyId: number,
    userId: number,
    dto: CreateLeaveDto,
  ): Promise<StaffLeaveRecord> {
    const startDt = DateTime.fromISO(dto.startDate);
    const endDt = DateTime.fromISO(dto.endDate);

    if (!startDt.isValid || !endDt.isValid) {
      throw new BadRequestException("Invalid date format");
    }

    if (endDt < startDt) {
      throw new BadRequestException("End date must be on or after start date");
    }

    const record = this.leaveRepo.create({
      companyId,
      userId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      notes: dto.notes ?? null,
    });

    return this.leaveRepo.save(record);
  }

  async deleteRecord(companyId: number, recordId: number, requestingUserId: number): Promise<void> {
    const record = await this.leaveRepo.findOne({
      where: { id: recordId, companyId },
    });

    if (!record) {
      throw new NotFoundException("Leave record not found");
    }

    if (record.userId !== requestingUserId) {
      throw new ForbiddenException("Only the leave owner or an admin can delete this record");
    }

    await this.leaveRepo.remove(record);
  }

  async adminDeleteRecord(companyId: number, recordId: number): Promise<void> {
    const record = await this.leaveRepo.findOne({
      where: { id: recordId, companyId },
    });

    if (!record) {
      throw new NotFoundException("Leave record not found");
    }

    await this.leaveRepo.remove(record);
  }

  async uploadSickNote(
    companyId: number,
    recordId: number,
    userId: number,
    file: Express.Multer.File,
  ): Promise<StaffLeaveRecord> {
    const record = await this.leaveRepo.findOne({
      where: { id: recordId, companyId },
    });

    if (!record) {
      throw new NotFoundException("Leave record not found");
    }

    if (record.userId !== userId) {
      throw new ForbiddenException("Only the leave owner can upload a sick note");
    }

    if (record.leaveType !== LeaveType.SICK) {
      throw new BadRequestException("Sick notes can only be uploaded for sick leave records");
    }

    const subPath = `${StorageArea.STOCK_CONTROL}/leave/${companyId}/${recordId}`;
    const result = await this.storageService.upload(file, subPath);

    record.sickNoteUrl = result.path;
    record.sickNoteOriginalFilename = result.originalFilename;

    return this.leaveRepo.save(record);
  }

  async sickNotePresignedUrl(companyId: number, recordId: number): Promise<string> {
    const record = await this.leaveRepo.findOne({
      where: { id: recordId, companyId },
    });

    if (!record) {
      throw new NotFoundException("Leave record not found");
    }

    if (!record.sickNoteUrl) {
      throw new NotFoundException("No sick note uploaded for this record");
    }

    return this.storageService.presignedUrl(record.sickNoteUrl, 3600);
  }

  async activeLeaveForUser(
    companyId: number,
    userId: number,
    onDate: DateTime,
  ): Promise<StaffLeaveRecord | null> {
    const dateStr = onDate.toISODate();
    if (!dateStr) {
      return null;
    }

    return this.leaveRepo.findOne({
      where: {
        companyId,
        userId,
        startDate: LessThanOrEqual(dateStr),
        endDate: MoreThanOrEqual(dateStr),
      },
    });
  }

  async usersOnLeaveToday(companyId: number): Promise<number[]> {
    const today = DateTime.now().toISODate();
    if (!today) {
      return [];
    }

    const records = await this.leaveRepo.find({
      where: {
        companyId,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      select: ["userId"],
    });

    return records.map((r) => r.userId);
  }
}
