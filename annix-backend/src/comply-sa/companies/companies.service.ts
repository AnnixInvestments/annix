import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "./entities/company.entity";

@Injectable()
export class ComplySaCompaniesService {
  constructor(
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
  ) {}

  async companyProfile(companyId: number): Promise<ComplySaCompany> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async updateProfile(companyId: number, data: Partial<ComplySaCompany>): Promise<ComplySaCompany> {
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
