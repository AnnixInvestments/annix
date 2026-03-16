import { Readable } from "node:stream";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { Repository } from "typeorm";
import { nowMillis } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { Candidate } from "../entities/candidate.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { WorkflowAutomationService } from "./workflow-automation.service";

@Injectable()
export class EmailMonitorService implements OnModuleInit {
  private readonly logger = new Logger(EmailMonitorService.name);

  constructor(
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly candidateService: CandidateService,
    private readonly workflowAutomationService: WorkflowAutomationService,
    private readonly configService: ConfigService,
  ) {}

  private isMonitoringConfigured = false;
  private isPolling = false;

  onModuleInit() {
    const hasImapConfig =
      !!this.configService.get<string>("CV_EMAIL_HOST") ||
      !!this.configService.get<string>("CV_IMAP_HOST");
    this.isMonitoringConfigured = hasImapConfig;
    if (!hasImapConfig) {
      this.logger.debug("CV email monitoring not configured, skipping polls");
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: "cv-assistant:poll-emails" })
  async pollEmails(): Promise<void> {
    if (!this.isMonitoringConfigured || this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      const companies = await this.companyRepo.find({
        where: { monitoringEnabled: true },
      });

      await Promise.all(
        companies
          .filter((c) => c.imapHost && c.imapUser && c.imapPasswordEncrypted)
          .map(async (company) => {
            try {
              await this.processCompanyEmails(company);
            } catch (error: unknown) {
              this.logger.error(
                `Failed to process emails for company ${company.id}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
      );
    } finally {
      this.isPolling = false;
    }
  }

  private async processCompanyEmails(company: CvAssistantCompany): Promise<void> {
    const activeJobs = await this.jobPostingRepo.find({
      where: { companyId: company.id, status: JobPostingStatus.ACTIVE },
    });

    if (activeJobs.length === 0) {
      return;
    } else {
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

        await Promise.all(
          messages.map((message) => this.processEmail(message, activeJobs, company)),
        );
      } finally {
        if (connection) {
          connection.end();
        }
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
      if (!all) {
        return;
      } else {
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
        } else {
          const pdfAttachments = (parsed.attachments || []).filter(
            (att) =>
              att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
          );

          if (pdfAttachments.length === 0) {
            this.logger.debug(`No PDF attachments in email: ${subject}`);
          } else {
            await Promise.all(
              pdfAttachments.map(async (attachment) => {
                const messageId = parsed.messageId || `${nowMillis()}-${Math.random()}`;
                const existing = await this.candidateRepo.findOne({
                  where: { sourceEmailId: messageId, jobPostingId: matchingJob.id },
                });

                if (existing) {
                  this.logger.debug(`Candidate already exists for email: ${messageId}`);
                } else {
                  const multerFile: Express.Multer.File = {
                    fieldname: "cv",
                    originalname: attachment.filename || "cv.pdf",
                    encoding: "7bit",
                    mimetype: "application/pdf",
                    size: attachment.size,
                    buffer: attachment.content,
                    stream: Readable.from(attachment.content),
                    destination: "",
                    filename: "",
                    path: "",
                  };

                  const subPath = `cv-assistant/candidates/${company.id}`;
                  const storageResult = await this.storageService.upload(multerFile, subPath);

                  const candidate = await this.candidateService.create(matchingJob.id, {
                    email: fromEmail,
                    cvFilePath: storageResult.path,
                    sourceEmailId: messageId,
                  });

                  this.logger.log(
                    `Created candidate ${candidate.id} from email for job ${matchingJob.id}`,
                  );

                  await this.workflowAutomationService.processCandidateCv(candidate.id);
                }
              }),
            );
          }
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process email: ${error instanceof Error ? error.message : String(error)}`,
      );
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
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
