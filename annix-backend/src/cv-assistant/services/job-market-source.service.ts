import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateJobMarketSourceDto, UpdateJobMarketSourceDto } from "../dto/job-market.dto";
import { JobMarketSource } from "../entities/job-market-source.entity";

@Injectable()
export class JobMarketSourceService {
  constructor(
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
  ) {}

  async create(companyId: number, dto: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    const source = this.sourceRepo.create({
      provider: dto.provider,
      name: dto.name,
      apiId: dto.apiId ?? null,
      apiKeyEncrypted: dto.apiKey ?? null,
      countryCodes: dto.countryCodes ?? ["za"],
      categories: dto.categories ?? [],
      ingestionIntervalHours: dto.ingestionIntervalHours ?? 6,
      companyId,
    });

    return this.sourceRepo.save(source);
  }

  async findAllForCompany(companyId: number): Promise<JobMarketSource[]> {
    return this.sourceRepo.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  async findById(id: number, companyId: number): Promise<JobMarketSource> {
    const source = await this.sourceRepo.findOne({ where: { id, companyId } });
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

    if (dto.name !== undefined) source.name = dto.name;
    if (dto.apiId !== undefined) source.apiId = dto.apiId;
    if (dto.apiKey !== undefined) source.apiKeyEncrypted = dto.apiKey;
    if (dto.countryCodes !== undefined) source.countryCodes = dto.countryCodes;
    if (dto.categories !== undefined) source.categories = dto.categories;
    if (dto.enabled !== undefined) source.enabled = dto.enabled;
    if (dto.ingestionIntervalHours !== undefined)
      source.ingestionIntervalHours = dto.ingestionIntervalHours;

    return this.sourceRepo.save(source);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const source = await this.findById(id, companyId);
    await this.sourceRepo.remove(source);
  }
}
