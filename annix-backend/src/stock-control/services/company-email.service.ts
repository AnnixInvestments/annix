import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { EmailOptions, EmailService } from "../../email/email.service";
import { nowMillis } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import { StockControlCompany } from "../entities/stock-control-company.entity";

export interface SmtpConfigDto {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  notificationEmails?: string[];
}

export interface SmtpConfigResponse {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassSet: boolean;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  notificationEmails: string[];
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
      const ccRecipients = (company?.notificationEmails ?? []).filter(
        (email) => email !== options.to,
      );
      const optionsWithCc =
        ccRecipients.length > 0 ? { ...options, cc: ccRecipients.join(", ") } : options;
      return this.emailService.sendEmail(optionsWithCc);
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
      const messageId = `<${nowMillis()}.${Math.random().toString(36).substring(2)}@${domain}>`;

      const ccRecipients = (company.notificationEmails ?? []).filter(
        (email) => email !== options.to,
      );

      await transporter.sendMail({
        from,
        to: options.to,
        ...(ccRecipients.length > 0 ? { cc: ccRecipients.join(", ") } : {}),
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
      notificationEmails: company?.notificationEmails ?? [],
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
      ...(dto.notificationEmails !== undefined
        ? { notificationEmails: dto.notificationEmails }
        : {}),
    };

    if (dto.smtpPass !== null && dto.smtpPass !== undefined) {
      if (!encryptionKey) {
        throw new BadRequestException(
          "Server encryption key not configured — cannot store SMTP password securely",
        );
      }
      update.smtpPassEncrypted = encrypt(dto.smtpPass, encryptionKey);
    } else if (dto.smtpHost === null) {
      update.smtpPassEncrypted = null;
    }

    await this.companyRepo.update(companyId, update);
    return { message: "SMTP configuration updated" };
  }

  async testSmtpConfig(companyId: number, recipientEmail: string): Promise<{ message: string }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company?.smtpHost || !company.smtpPort || !company.smtpUser) {
      throw new BadRequestException(
        "SMTP host, port, and username must be configured before sending a test email",
      );
    }

    if (!company.smtpPassEncrypted) {
      throw new BadRequestException(
        "SMTP password not set — save your configuration with a password first",
      );
    }

    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new BadRequestException("Server encryption key not configured");
    }

    const password = decrypt(company.smtpPassEncrypted, encryptionKey);

    try {
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
    } catch (err) {
      const smtpError = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP test failed for company ${companyId}: ${smtpError}`);
      throw new BadRequestException(`SMTP connection failed: ${smtpError}`);
    }
  }
}
