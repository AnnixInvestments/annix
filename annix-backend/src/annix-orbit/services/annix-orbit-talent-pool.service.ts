import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitTalentPoolDto,
  UpdateAnnixOrbitTalentPoolDto,
} from "../dto/annix-orbit-talent-pool.dto";
import { type AnnixOrbitTalentPool } from "../entities/annix-orbit-talent-pool.entity";
import { AnnixOrbitTalentPoolRepository } from "../repositories/annix-orbit-talent-pool.repository";

@Injectable()
export class AnnixOrbitTalentPoolService {
  constructor(private readonly poolRepo: AnnixOrbitTalentPoolRepository) {}

  findForCompany(companyId: number): Promise<AnnixOrbitTalentPool[]> {
    return this.poolRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentPool> {
    const pool = await this.poolRepo.findByIdForCompany(id, companyId);
    if (!pool) {
      throw new NotFoundException("Talent pool not found");
    }
    return pool;
  }

  create(companyId: number, dto: CreateAnnixOrbitTalentPoolDto): Promise<AnnixOrbitTalentPool> {
    return this.poolRepo.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      candidateIds: dto.candidateIds ?? [],
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitTalentPoolDto,
  ): Promise<AnnixOrbitTalentPool> {
    const pool = await this.findByIdForCompany(id, companyId);
    pool.name = dto.name;
    pool.description = dto.description ?? null;
    pool.candidateIds = dto.candidateIds ?? [];
    return this.poolRepo.save(pool);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const pool = await this.findByIdForCompany(id, companyId);
    await this.poolRepo.remove(pool);
  }
}
