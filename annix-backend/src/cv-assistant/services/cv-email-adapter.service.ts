import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ClassificationResult } from "../../inbound-email/interfaces/document-classifier.interface";
import { RoutingResult } from "../../inbound-email/interfaces/document-router.interface";
import { EmailAppAdapter } from "../../inbound-email/interfaces/email-app-adapter.interface";
import { Candidate } from "../entities/candidate.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { WorkflowAutomationService } from "./workflow-automation.service";

export enum CvDocumentType {
  CV_APPLICATION = "cv_application",
  UNKNOWN = "unknown",
}

const CV_APP_NAME = "cv-assistant";

const SUPPORTED_MIMES = ["application/pdf"];

@Injectable()
export class CvEmailAdapterService implements EmailAppAdapter, OnModuleInit {
  private readonly logger = new Logger(CvEmailAdapterService.name);

  constructor(
    private readonly registry: InboundEmailRegistry,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    private readonly candidateService: CandidateService,
    private readonly workflowAutomationService: WorkflowAutomationService,
  ) {}

  onModuleInit() {
    this.registry.registerAdapter(this);
  }

  appName(): string {
    return CV_APP_NAME;
  }

  supportedMimeTypes(): string[] {
    return SUPPORTED_MIMES;
  }

  async resolveCompanyId(
    _fromEmail: string,
    configCompanyId: number | null,
  ): Promise<number | null> {
    return configCompanyId;
  }

  classifyFromSubject(_subject: string, filename: string): ClassificationResult | null {
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return null;
    }
    return { documentType: CvDocumentType.CV_APPLICATION, confidence: 0.8, source: "subject" };
  }

  async classifyFromContent(
    _content: string | Buffer,
    mimeType: string,
    _filename: string,
    _fromEmail: string,
    _subject: string,
  ): Promise<ClassificationResult> {
    if (mimeType !== "application/pdf") {
      return { documentType: CvDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
    }
    return { documentType: CvDocumentType.CV_APPLICATION, confidence: 0.8, source: "content_ai" };
  }

  async route(
    attachment: InboundEmailAttachment,
    _fileBuffer: Buffer,
    companyId: number | null,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    if (!companyId) {
      this.logger.warn("No company ID for CV routing, skipping");
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const activeJobs = await this.jobPostingRepo.find({
      where: { companyId, status: JobPostingStatus.ACTIVE },
    });

    const matchingJob = activeJobs.find((job) => {
      if (job.emailSubjectPattern) {
        const pattern = new RegExp(job.emailSubjectPattern, "i");
        return pattern.test(subject);
      }
      return subject.toLowerCase().includes(job.title.toLowerCase());
    });

    if (!matchingJob) {
      this.logger.debug(`No matching job posting for CV email subject: ${subject}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const sourceEmailId = `attachment-${attachment.id}`;
    const existing = await this.candidateRepo.findOne({
      where: { sourceEmailId, jobPostingId: matchingJob.id },
    });

    if (existing) {
      return {
        linkedEntityType: "Candidate",
        linkedEntityId: existing.id,
        extractionTriggered: false,
      };
    }

    try {
      const candidate = await this.candidateService.create(matchingJob.id, {
        email: fromEmail,
        cvFilePath: attachment.s3Path,
        sourceEmailId,
      });

      this.logger.log(`Created candidate ${candidate.id} from email for job ${matchingJob.id}`);

      this.workflowAutomationService.processCandidateCv(candidate.id).catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process candidate CV ${candidate.id}: ${msg}`);
      });

      return {
        linkedEntityType: "Candidate",
        linkedEntityId: candidate.id,
        extractionTriggered: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create candidate from email: ${msg}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }
  }
}
