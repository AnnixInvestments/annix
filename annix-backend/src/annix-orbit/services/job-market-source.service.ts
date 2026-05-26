import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateJobMarketSourceDto, UpdateJobMarketSourceDto } from "../dto/job-market.dto";
import { JobMarketSource } from "../entities/job-market-source.entity";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";

@Injectable()
export class JobMarketSourceService {
  constructor(private readonly sourceRepo: JobMarketSourceRepository) {}

  async create(companyId: number, dto: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    return this.sourceRepo.create({
      provider: dto.provider,
      name: dto.name,
      apiId: dto.apiId ?? null,
      apiKeyEncrypted: dto.apiKey ?? null,
      countryCodes: dto.countryCodes ?? ["za"],
      categories: dto.categories ?? [],
      visibleTiers: dto.visibleTiers ?? null,
      ingestionIntervalHours: dto.ingestionIntervalHours ?? 6,
      companyId,
    });
  }

  async findAllForCompany(companyId: number): Promise<JobMarketSource[]> {
    return this.sourceRepo.findForCompany(companyId);
  }

  async findById(id: number, companyId: number): Promise<JobMarketSource> {
    const source = await this.sourceRepo.findByIdForCompany(id, companyId);
    if (!source) {
      throw new NotFoundException("Job market source not found");
    }
    return source;
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateJobMarketSourceDto,
  ): Promise<JobMarketSource> {
    const source = await this.findById(id, companyId);

    if (dto.name != null) source.name = dto.name;
    if (dto.apiId != null) source.apiId = dto.apiId;
    if (dto.apiKey != null) source.apiKeyEncrypted = dto.apiKey;
    if (dto.countryCodes != null) source.countryCodes = dto.countryCodes;
    if (dto.categories != null) source.categories = dto.categories;
    if (dto.visibleTiers != null) source.visibleTiers = dto.visibleTiers;
    if (dto.enabled != null) source.enabled = dto.enabled;
    if (dto.ingestionIntervalHours != null)
      source.ingestionIntervalHours = dto.ingestionIntervalHours;

    return this.sourceRepo.save(source);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const source = await this.findById(id, companyId);
    await this.sourceRepo.remove(source);
  }

  async createPlatformGlobal(dto: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    return this.sourceRepo.create({
      provider: dto.provider,
      name: dto.name,
      apiId: dto.apiId ?? null,
      apiKeyEncrypted: dto.apiKey ?? null,
      countryCodes: dto.countryCodes ?? ["za"],
      categories: dto.categories ?? [],
      visibleTiers: dto.visibleTiers ?? null,
      ingestionIntervalHours: dto.ingestionIntervalHours ?? 6,
      companyId: null,
    });
  }

  async findAllPlatformGlobal(): Promise<JobMarketSource[]> {
    return this.sourceRepo.findManyWhere({ companyId: null } as Partial<JobMarketSource>);
  }

  async findByIdPlatformGlobal(id: number): Promise<JobMarketSource> {
    const source = await this.sourceRepo.findById(id);
    if (!source || source.companyId !== null) {
      throw new NotFoundException("Job market source not found");
    }
    return source;
  }

  async updatePlatformGlobal(id: number, dto: UpdateJobMarketSourceDto): Promise<JobMarketSource> {
    const source = await this.findByIdPlatformGlobal(id);

    if (dto.name != null) source.name = dto.name;
    if (dto.apiId != null) source.apiId = dto.apiId;
    if (dto.apiKey != null) source.apiKeyEncrypted = dto.apiKey;
    if (dto.countryCodes != null) source.countryCodes = dto.countryCodes;
    if (dto.categories != null) source.categories = dto.categories;
    if (dto.visibleTiers != null) source.visibleTiers = dto.visibleTiers;
    if (dto.enabled != null) source.enabled = dto.enabled;
    if (dto.ingestionIntervalHours != null)
      source.ingestionIntervalHours = dto.ingestionIntervalHours;

    return this.sourceRepo.save(source);
  }

  async removePlatformGlobal(id: number): Promise<void> {
    const source = await this.findByIdPlatformGlobal(id);
    await this.sourceRepo.remove(source);
  }
}
