import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";

@Injectable()
export class AnnixSentinelCompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(AnnixSentinelCompanyDetails)
    private readonly detailsRepository: Repository<AnnixSentinelCompanyDetails>,
  ) {}

  async companyProfile(companyId: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async updateProfile(companyId: number, data: Partial<Company>): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const updatedCompany = this.companyRepository.merge(company, data);
    return this.companyRepository.save(updatedCompany);
  }
}
