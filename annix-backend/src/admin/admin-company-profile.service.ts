import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { CompanyProfile } from "./entities/company-profile.entity";

@Injectable()
export class AdminCompanyProfileService {
  private readonly logger = new Logger(AdminCompanyProfileService.name);

  constructor(
    @InjectRepository(CompanyProfile)
    private readonly companyProfileRepo: Repository<CompanyProfile>,
  ) {}

  async profile(): Promise<CompanyProfile> {
    const row = await this.companyProfileRepo.findOne({ where: { id: 1 } });
    if (!row) {
      throw new NotFoundException("Company profile not found. Run migrations to seed it.");
    }
    return row;
  }

  async updateProfile(dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const existing = await this.profile();
    const merged = this.companyProfileRepo.merge(existing, dto);
    const saved = await this.companyProfileRepo.save(merged);
    this.logger.log("Company profile updated");
    return saved;
  }
}
