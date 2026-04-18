import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailService } from "../../inbound-email/inbound-email.service";
import { Company } from "../../platform/entities/company.entity";
import { UpdateCompanyDto, UpdateImapSettingsDto } from "../dto/settings.dto";

const CV_APP_NAME = "cv-assistant";

export interface CvCompanySettingsResponse {
  id: number;
  name: string;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapConfigured: boolean;
  monitoringEnabled: boolean;
  emailFromAddress: string | null;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly inboundEmailService: InboundEmailService,
  ) {}

  async companySettings(companyId: number): Promise<CvCompanySettingsResponse> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const emailConfig = await this.inboundEmailService.emailConfig(CV_APP_NAME, companyId);

    return {
      id: company.id,
      name: company.name,
      imapHost: emailConfig.emailHost,
      imapPort: emailConfig.emailPort,
      imapUser: emailConfig.emailUser,
      imapConfigured: Boolean(emailConfig.emailHost && emailConfig.emailUser),
      monitoringEnabled: emailConfig.enabled,
      emailFromAddress: company.email,
    };
  }

  async updateImapSettings(
    companyId: number,
    dto: UpdateImapSettingsDto,
  ): Promise<{ message: string }> {
    const existing = await this.inboundEmailService.emailConfig(CV_APP_NAME, companyId);

    const emailHost = dto.imapHost ?? existing.emailHost;
    if (!emailHost) {
      return { message: "IMAP host is required to enable monitoring." };
    }

    const result = await this.inboundEmailService.updateEmailConfig(CV_APP_NAME, companyId, {
      emailHost,
      emailPort: dto.imapPort ?? existing.emailPort ?? 993,
      emailUser: dto.imapUser ?? existing.emailUser,
      emailPass: dto.imapPassword ?? null,
      tlsEnabled: existing.tlsEnabled,
      tlsServerName: existing.tlsServerName,
      enabled: dto.monitoringEnabled ?? existing.enabled,
    });

    if (dto.emailFromAddress != null) {
      const company = await this.companyRepo.findOne({ where: { id: companyId } });
      if (company) {
        company.email = dto.emailFromAddress;
        await this.companyRepo.save(company);
      }
    }

    return result;
  }

  async updateCompany(companyId: number, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    if (dto.name != null) company.name = dto.name;

    return this.companyRepo.save(company);
  }
}
