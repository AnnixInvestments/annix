import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { Repository } from "typeorm";
import { Candidate } from "../entities/candidate.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { WorkflowAutomationService } from "./workflow-automation.service";

@Injectable()
export class EmailMonitorService implements OnModuleInit {
  private readonly logger = new Logger(EmailMonitorService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    private readonly candidateService: CandidateService,
    private readonly workflowAutomationService: WorkflowAutomationService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), "uploads", "cv-assistant");
  }

  onModuleInit() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollEmails(): Promise<void> {
    const companies = await this.companyRepo.find({
      where: { monitoringEnabled: true },
    });

    for (const company of companies) {
      if (company.imapHost && company.imapUser && company.imapPasswordEncrypted) {
        try {
          await this.processCompanyEmails(company);
        } catch (error) {
          this.logger.error(`Failed to process emails for company ${company.id}: ${error.message}`);
        }
      }
    }
  }

  private async processCompanyEmails(company: CvAssistantCompany): Promise<void> {
    const activeJobs = await this.jobPostingRepo.find({
      where: { companyId: company.id, status: JobPostingStatus.ACTIVE },
    });

    if (activeJobs.length === 0) {
      return;
    }

    const imapConfig: Imap.ImapSimpleOptions = {
      imap: {
        user: company.imapUser!,
        password: this.decryptPassword(company.imapPasswordEncrypted!),
        host: company.imapHost!,
        port: company.imapPort || 993,
        tls: true,
        authTimeout: 10000,
      },
    };

    let connection: Imap.ImapSimple | null = null;

    try {
      connection = await Imap.connect(imapConfig);
      await connection.openBox("INBOX");

      const searchCriteria = ["UNSEEN"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      for (const message of messages) {
        await this.processEmail(message, activeJobs, company);
      }
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  private async processEmail(
    message: Imap.Message,
    activeJobs: JobPosting[],
    company: CvAssistantCompany,
  ): Promise<void> {
    try {
      const all = message.parts.find((part) => part.which === "");
      if (!all) return;

      const parsed = await simpleParser(all.body);
      const subject = parsed.subject || "";
      const fromEmail = parsed.from?.value[0]?.address || null;

      const matchingJob = activeJobs.find((job) => {
        if (job.emailSubjectPattern) {
          const pattern = new RegExp(job.emailSubjectPattern, "i");
          return pattern.test(subject);
        }
        return subject.toLowerCase().includes(job.title.toLowerCase());
      });

      if (!matchingJob) {
        this.logger.debug(`No matching job for email subject: ${subject}`);
        return;
      }

      const pdfAttachments = (parsed.attachments || []).filter(
        (att) =>
          att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
      );

      if (pdfAttachments.length === 0) {
        this.logger.debug(`No PDF attachments in email: ${subject}`);
        return;
      }

      for (const attachment of pdfAttachments) {
        const messageId = parsed.messageId || `${Date.now()}-${Math.random()}`;
        const existing = await this.candidateRepo.findOne({
          where: { sourceEmailId: messageId, jobPostingId: matchingJob.id },
        });

        if (existing) {
          this.logger.debug(`Candidate already exists for email: ${messageId}`);
          continue;
        }

        const filename = `${Date.now()}-${attachment.filename || "cv.pdf"}`;
        const filePath = path.join(this.uploadDir, `${company.id}`, filename);

        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, attachment.content);

        const candidate = await this.candidateService.create(matchingJob.id, {
          email: fromEmail,
          cvFilePath: filePath,
          sourceEmailId: messageId,
        });

        this.logger.log(`Created candidate ${candidate.id} from email for job ${matchingJob.id}`);

        await this.workflowAutomationService.processCandidateCv(candidate.id);
      }
    } catch (error) {
      this.logger.error(`Failed to process email: ${error.message}`);
    }
  }

  private decryptPassword(encrypted: string): string {
    return encrypted;
  }

  async testImapConnection(
    host: string,
    port: number,
    user: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const config: Imap.ImapSimpleOptions = {
      imap: {
        user,
        password,
        host,
        port,
        tls: true,
        authTimeout: 10000,
      },
    };

    try {
      const connection = await Imap.connect(config);
      await connection.openBox("INBOX");
      connection.end();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
