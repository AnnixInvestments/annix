import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { CompanyProfile } from "./entities/company-profile.entity";
import { CompanyProfileRepository } from "./repositories/company-profile.repository";

@Injectable()
export class AdminCompanyProfileService {
  private readonly logger = new Logger(AdminCompanyProfileService.name);

  constructor(private readonly companyProfileRepo: CompanyProfileRepository) {}

  async profile(): Promise<CompanyProfile> {
    const row = await this.companyProfileRepo.findSingleton();
    if (!row) {
      throw new NotFoundException("Company profile not found. Run migrations to seed it.");
    }
    return row;
  }

  async updateProfile(dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const existing = await this.profile();
    const defined = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const merged: CompanyProfile = { ...existing, ...defined };
    const saved = await this.companyProfileRepo.save(merged);
    this.logger.log("Company profile updated");
    return saved;
  }
}
