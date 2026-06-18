import { Injectable, NotFoundException } from "@nestjs/common";
import { CompanyRepository } from "../../platform/company.repository";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository";

@Injectable()
export class AnnixSentinelCompaniesService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly detailsRepository: AnnixSentinelCompanyDetailsRepository,
  ) {}

  async companyProfile(companyId: number): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async updateProfile(companyId: number, data: Partial<Company>): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const updatedCompany = Object.assign(company, data);
    return this.companyRepository.save(updatedCompany);
  }
}
