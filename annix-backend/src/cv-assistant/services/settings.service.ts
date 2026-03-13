import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateCompanyDto, UpdateImapSettingsDto } from "../dto/settings.dto";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

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

    if (dto.imapHost != null) company.imapHost = dto.imapHost;
    if (dto.imapPort != null) company.imapPort = dto.imapPort;
    if (dto.imapUser != null) company.imapUser = dto.imapUser;
    if (dto.imapPassword != null) {
      company.imapPasswordEncrypted = this.encryptPassword(dto.imapPassword);
    }
    if (dto.monitoringEnabled != null) company.monitoringEnabled = dto.monitoringEnabled;
    if (dto.emailFromAddress != null) company.emailFromAddress = dto.emailFromAddress;

    return this.companyRepo.save(company);
  }

  async updateCompany(companyId: number, dto: UpdateCompanyDto): Promise<CvAssistantCompany> {
    const company = await this.companySettings(companyId);

    if (dto.name != null) company.name = dto.name;

    return this.companyRepo.save(company);
  }

  private encryptPassword(password: string): string {
    this.logger.warn(
      "IMAP password stored without encryption — implement AES-256-GCM or Fly.io secrets",
    );
    return password;
  }
}
