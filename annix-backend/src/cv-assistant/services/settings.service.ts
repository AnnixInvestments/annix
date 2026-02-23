import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateCompanyDto, UpdateImapSettingsDto } from "../dto/settings.dto";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
  ) {}

  async companySettings(companyId: number): Promise<CvAssistantCompany> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Company not found");
    }
    return company;
  }

  async updateImapSettings(
    companyId: number,
    dto: UpdateImapSettingsDto,
  ): Promise<CvAssistantCompany> {
    const company = await this.companySettings(companyId);

    if (dto.imapHost !== undefined) company.imapHost = dto.imapHost;
    if (dto.imapPort !== undefined) company.imapPort = dto.imapPort;
    if (dto.imapUser !== undefined) company.imapUser = dto.imapUser;
    if (dto.imapPassword !== undefined) {
      company.imapPasswordEncrypted = this.encryptPassword(dto.imapPassword);
    }
    if (dto.monitoringEnabled !== undefined) company.monitoringEnabled = dto.monitoringEnabled;
    if (dto.emailFromAddress !== undefined) company.emailFromAddress = dto.emailFromAddress;

    return this.companyRepo.save(company);
  }

  async updateCompany(companyId: number, dto: UpdateCompanyDto): Promise<CvAssistantCompany> {
    const company = await this.companySettings(companyId);

    if (dto.name !== undefined) company.name = dto.name;

    return this.companyRepo.save(company);
  }

  private encryptPassword(password: string): string {
    return password;
  }
}
