import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { StaffMember } from "../entities/staff-member.entity";

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

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

    const members = await this.staffRepo.find({
      where,
      order: { name: "ASC" },
    });

    return this.withPresignedPhotoUrls(members);
  }

  async findById(companyId: number, id: number): Promise<StaffMember> {
    const member = await this.findByIdInternal(companyId, id);
    return this.withPresignedPhotoUrl(member);
  }

  async findAllActive(companyId: number): Promise<StaffMember[]> {
    const members = await this.staffRepo.find({
      where: { companyId, active: true },
      order: { name: "ASC" },
    });
    return this.withPresignedPhotoUrls(members);
  }

  async create(companyId: number, data: Partial<StaffMember>): Promise<StaffMember> {
    const member = this.staffRepo.create({
      ...data,
      companyId,
      qrToken: randomUUID(),
    });
    const saved = await this.staffRepo.save(member);
    return this.withPresignedPhotoUrl(saved);
  }

  async update(companyId: number, id: number, data: Partial<StaffMember>): Promise<StaffMember> {
    const member = await this.findByIdInternal(companyId, id);
    Object.assign(member, data);
    const saved = await this.staffRepo.save(member);
    return this.withPresignedPhotoUrl(saved);
  }

  async softDelete(companyId: number, id: number): Promise<StaffMember> {
    const member = await this.findByIdInternal(companyId, id);
    member.active = false;
    const saved = await this.staffRepo.save(member);
    return this.withPresignedPhotoUrl(saved);
  }

  private async findByIdInternal(companyId: number, id: number): Promise<StaffMember> {
    const member = await this.staffRepo.findOne({
      where: { id, companyId },
    });

    if (!member) {
      throw new NotFoundException(`Staff member ${id} not found`);
    }

    return member;
  }

  async uploadPhoto(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<StaffMember> {
    const member = await this.staffRepo.findOne({ where: { id, companyId } });
    if (!member) {
      throw new NotFoundException(`Staff member ${id} not found`);
    }
    const result = await this.storageService.upload(file, "stock-control/staff");
    member.photoUrl = result.path;
    const saved = await this.staffRepo.save(member);
    return this.withPresignedPhotoUrl(saved);
  }

  private async withPresignedPhotoUrl(member: StaffMember): Promise<StaffMember> {
    if (!member.photoUrl) {
      return member;
    }

    let s3Path: string | null = null;

    if (member.photoUrl.startsWith("http")) {
      const s3Match = member.photoUrl.match(/\.amazonaws\.com\/(.+?)(\?|$)/);
      if (s3Match) {
        s3Path = decodeURIComponent(s3Match[1]);
        this.logger.log(`Extracted S3 path from URL for ${member.name}: ${s3Path}`);
      }
    } else {
      s3Path = member.photoUrl;
    }

    if (s3Path) {
      try {
        member.photoUrl = await this.storageService.getPresignedUrl(s3Path, 3600);
        this.logger.log(`Presigned URL generated for ${member.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to generate presigned URL for ${member.name} (${s3Path}): ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return member;
  }

  private async withPresignedPhotoUrls(members: StaffMember[]): Promise<StaffMember[]> {
    return Promise.all(members.map((m) => this.withPresignedPhotoUrl(m)));
  }
}
