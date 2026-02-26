import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { StaffMember } from "../entities/staff-member.entity";

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffMember)
    private readonly staffRepo: Repository<StaffMember>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async findAll(
    companyId: number,
    filters?: { search?: string; active?: string },
  ): Promise<StaffMember[]> {
    const where: Record<string, unknown>[] = [];

    const baseWhere: Record<string, unknown> = { companyId };

    if (filters?.active === "true") {
      baseWhere.active = true;
    } else if (filters?.active === "false") {
      baseWhere.active = false;
    }

    if (filters?.search) {
      const pattern = ILike(`%${filters.search}%`);
      where.push(
        { ...baseWhere, name: pattern },
        { ...baseWhere, employeeNumber: pattern },
        { ...baseWhere, department: pattern },
      );
    } else {
      where.push(baseWhere);
    }

    return this.staffRepo.find({
      where,
      order: { name: "ASC" },
    });
  }

  async findById(companyId: number, id: number): Promise<StaffMember> {
    const member = await this.staffRepo.findOne({
      where: { id, companyId },
    });

    if (!member) {
      throw new NotFoundException(`Staff member ${id} not found`);
    }

    return member;
  }

  async findAllActive(companyId: number): Promise<StaffMember[]> {
    return this.staffRepo.find({
      where: { companyId, active: true },
      order: { name: "ASC" },
    });
  }

  async create(companyId: number, data: Partial<StaffMember>): Promise<StaffMember> {
    const member = this.staffRepo.create({
      ...data,
      companyId,
      qrToken: randomUUID(),
    });
    return this.staffRepo.save(member);
  }

  async update(companyId: number, id: number, data: Partial<StaffMember>): Promise<StaffMember> {
    const member = await this.findById(companyId, id);
    Object.assign(member, data);
    return this.staffRepo.save(member);
  }

  async softDelete(companyId: number, id: number): Promise<StaffMember> {
    const member = await this.findById(companyId, id);
    member.active = false;
    return this.staffRepo.save(member);
  }

  async uploadPhoto(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<StaffMember> {
    const member = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/staff");
    member.photoUrl = result.path;
    return this.staffRepo.save(member);
  }
}
