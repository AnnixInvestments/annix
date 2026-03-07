import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { EmailOptions, EmailService } from "../../email/email.service";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import { StockControlCompany } from "../entities/stock-control-company.entity";

export interface SmtpConfigDto {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
}

export interface SmtpConfigResponse {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassSet: boolean;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
}

@Injectable()
export class CompanyEmailService {
  private readonly logger = new Logger(CompanyEmailService.name);

  constructor(
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail(companyId: number, options: EmailOptions): Promise<boolean> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (
      !company?.smtpHost ||
      !company.smtpPort ||
      !company.smtpUser ||
      !company.smtpPassEncrypted
    ) {
      return this.emailService.sendEmail(options);
    }

    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!encryptionKey) {
      this.logger.warn("DOCUMENT_ENCRYPTION_KEY not set, falling back to global email");
      return this.emailService.sendEmail(options);
    }

    try {
      const password = decrypt(company.smtpPassEncrypted, encryptionKey);
      const transporter = nodemailer.createTransport({
        host: company.smtpHost,
        port: company.smtpPort,
        secure: company.smtpPort === 465,
        auth: {
          user: company.smtpUser,
          pass: password,
        },
      });

      const fromEmail = company.smtpFromEmail || company.smtpUser;
      const fromName = options.fromName || company.smtpFromName || company.name;
      const from = `"${fromName}" <${fromEmail}>`;

      const domain = fromEmail.split("@")[1] || "annix.co.za";
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;

      await transporter.sendMail({
        from,
        to: options.to,
        replyTo: options.replyTo || fromEmail,
        subject: options.subject,
        html: options.html,
        text: options.text,
        messageId,
        headers: {
          "X-Mailer": "Annix Platform",
          "Message-ID": messageId,
          "X-Auto-Response-Suppress": "OOF, AutoReply",
        },
      });

      this.logger.log(`Company email sent to ${options.to} via ${company.smtpHost}`);
      return true;
    } catch (error) {
      this.logger.error(`Company SMTP send failed for company ${companyId}: ${error.message}`);
      return false;
    }
  }

  async smtpConfig(companyId: number): Promise<SmtpConfigResponse> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    return {
      smtpHost: company?.smtpHost ?? null,
      smtpPort: company?.smtpPort ?? null,
      smtpUser: company?.smtpUser ?? null,
      smtpPassSet: company?.smtpPassEncrypted !== null && company?.smtpPassEncrypted !== undefined,
      smtpFromName: company?.smtpFromName ?? null,
      smtpFromEmail: company?.smtpFromEmail ?? null,
    };
  }

  async updateSmtpConfig(companyId: number, dto: SmtpConfigDto): Promise<{ message: string }> {
    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");

    const update: Partial<StockControlCompany> = {
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpUser: dto.smtpUser,
      smtpFromName: dto.smtpFromName,
      smtpFromEmail: dto.smtpFromEmail,
    };

    if (dto.smtpPass !== null && dto.smtpPass !== undefined && encryptionKey) {
      update.smtpPassEncrypted = encrypt(dto.smtpPass, encryptionKey);
    } else if (dto.smtpHost === null) {
      update.smtpPassEncrypted = null;
    }

    await this.companyRepo.update(companyId, update);
    return { message: "SMTP configuration updated" };
  }

  async testSmtpConfig(companyId: number, recipientEmail: string): Promise<{ message: string }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (
      !company?.smtpHost ||
      !company.smtpPort ||
      !company.smtpUser ||
      !company.smtpPassEncrypted
    ) {
      throw new Error("SMTP not configured for this company");
    }

    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("Encryption key not configured");
    }

    const password = decrypt(company.smtpPassEncrypted, encryptionKey);
    const transporter = nodemailer.createTransport({
      host: company.smtpHost,
      port: company.smtpPort,
      secure: company.smtpPort === 465,
      auth: {
        user: company.smtpUser,
        pass: password,
      },
    });

    const fromEmail = company.smtpFromEmail || company.smtpUser;
    const fromName = company.smtpFromName || company.name;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: "Stock Control - SMTP Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0d9488;">SMTP Configuration Test</h2>
          <p>This is a test email from <strong>${company.name}</strong>'s Stock Control system.</p>
          <p>If you received this, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            Sent from: ${fromEmail}<br/>
            SMTP Host: ${company.smtpHost}:${company.smtpPort}
          </p>
        </div>
      `,
    });

    return { message: "Test email sent successfully" };
  }
}
