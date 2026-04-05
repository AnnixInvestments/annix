import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { Candidate } from "../entities/candidate.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { CvDocumentType, CvEmailAdapterService } from "./cv-email-adapter.service";
import { WorkflowAutomationService } from "./workflow-automation.service";

describe("CvEmailAdapterService", () => {
  let service: CvEmailAdapterService;

  const jobPostingRepo = {
    find: jest.fn(),
  };

  const candidateRepo = {
    findOne: jest.fn(),
  };

  const candidateService = {
    create: jest.fn(),
  };

  const workflowAutomationService = {
    processCandidateCv: jest.fn().mockResolvedValue(undefined),
  };

  const registry = { registerAdapter: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvEmailAdapterService,
        { provide: InboundEmailRegistry, useValue: registry },
        { provide: getRepositoryToken(JobPosting), useValue: jobPostingRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: CandidateService, useValue: candidateService },
        { provide: WorkflowAutomationService, useValue: workflowAutomationService },
      ],
    }).compile();

    service = module.get<CvEmailAdapterService>(CvEmailAdapterService);
    jest.clearAllMocks();
  });

  it("exposes correct appName", () => {
    expect(service.appName()).toBe("cv-assistant");
  });

  it("registers adapter on module init", () => {
    service.onModuleInit();
    expect(registry.registerAdapter).toHaveBeenCalledWith(service);
  });

  it("only supports PDF mime type", () => {
    expect(service.supportedMimeTypes()).toEqual(["application/pdf"]);
  });

  describe("classifyFromSubject", () => {
    it("classifies PDF filenames as cv_application", () => {
      const result = service.classifyFromSubject("Job application", "cv.pdf");
      expect(result?.documentType).toBe(CvDocumentType.CV_APPLICATION);
      expect(result?.confidence).toBe(0.8);
      expect(result?.source).toBe("subject");
    });

    it("returns null for non-PDF filenames", () => {
      expect(service.classifyFromSubject("Application", "cv.docx")).toBeNull();
      expect(service.classifyFromSubject("Application", "resume.jpg")).toBeNull();
    });

    it("is case-insensitive for PDF extension", () => {
      const result = service.classifyFromSubject("Application", "CV.PDF");
      expect(result?.documentType).toBe(CvDocumentType.CV_APPLICATION);
    });
  });

  describe("classifyFromContent", () => {
    it("classifies PDFs as cv_application", async () => {
      const result = await service.classifyFromContent(
        Buffer.from("pdf-bytes"),
        "application/pdf",
        "cv.pdf",
        "candidate@example.com",
        "Application",
      );
      expect(result.documentType).toBe(CvDocumentType.CV_APPLICATION);
      expect(result.confidence).toBe(0.8);
    });

    it("returns UNKNOWN for non-PDF mime types", async () => {
      const result = await service.classifyFromContent(
        Buffer.from(""),
        "image/jpeg",
        "photo.jpg",
        "candidate@example.com",
        "Application",
      );
      expect(result.documentType).toBe(CvDocumentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });
  });

  describe("resolveCompanyId", () => {
    it("returns configCompanyId unchanged", async () => {
      await expect(service.resolveCompanyId("any@example.com", 5)).resolves.toBe(5);
      await expect(service.resolveCompanyId("any@example.com", null)).resolves.toBeNull();
    });
  });

  describe("route - job matching", () => {
    const buildAttachment = (id = 1): InboundEmailAttachment =>
      ({
        id,
        s3Path: "cv-assistant/inbound/1/cv.pdf",
        documentType: CvDocumentType.CV_APPLICATION,
      }) as InboundEmailAttachment;

    it("returns empty result when companyId is null", async () => {
      const result = await service.route(
        buildAttachment(),
        Buffer.from(""),
        null,
        "candidate@example.com",
        "Application for Developer",
      );

      expect(result.linkedEntityType).toBeNull();
      expect(result.linkedEntityId).toBeNull();
      expect(result.extractionTriggered).toBe(false);
      expect(jobPostingRepo.find).not.toHaveBeenCalled();
    });

    it("matches job by emailSubjectPattern regex", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 10,
          title: "Senior Developer",
          emailSubjectPattern: "REF-2026-\\d+",
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);
      candidateRepo.findOne.mockResolvedValue(null);
      candidateService.create.mockResolvedValue({ id: 999, jobPostingId: 10 } as Candidate);

      const result = await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Application REF-2026-0408",
      );

      expect(result.linkedEntityType).toBe("Candidate");
      expect(result.linkedEntityId).toBe(999);
      expect(result.extractionTriggered).toBe(true);
      expect(candidateService.create).toHaveBeenCalledWith(10, {
        email: "candidate@example.com",
        cvFilePath: "cv-assistant/inbound/1/cv.pdf",
        sourceEmailId: "attachment-1",
      });
    });

    it("falls back to title substring match when no pattern", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 20,
          title: "Data Scientist",
          emailSubjectPattern: null,
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);
      candidateRepo.findOne.mockResolvedValue(null);
      candidateService.create.mockResolvedValue({ id: 888, jobPostingId: 20 } as Candidate);

      const result = await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Application for data scientist role",
      );

      expect(result.linkedEntityId).toBe(888);
      expect(candidateService.create).toHaveBeenCalled();
    });

    it("returns empty result when no job matches", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 30,
          title: "Plumber",
          emailSubjectPattern: null,
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);

      const result = await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Totally unrelated subject",
      );

      expect(result.linkedEntityType).toBeNull();
      expect(candidateService.create).not.toHaveBeenCalled();
    });

    it("deduplicates via sourceEmailId when candidate already exists", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 40,
          title: "Analyst",
          emailSubjectPattern: null,
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);
      candidateRepo.findOne.mockResolvedValue({ id: 777, jobPostingId: 40 } as Candidate);

      const result = await service.route(
        buildAttachment(42),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Analyst position",
      );

      expect(result.linkedEntityType).toBe("Candidate");
      expect(result.linkedEntityId).toBe(777);
      expect(result.extractionTriggered).toBe(false);
      expect(candidateService.create).not.toHaveBeenCalled();
      expect(candidateRepo.findOne).toHaveBeenCalledWith({
        where: { sourceEmailId: "attachment-42", jobPostingId: 40 },
      });
    });

    it("triggers workflow automation on new candidate creation", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 50,
          title: "Engineer",
          emailSubjectPattern: null,
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);
      candidateRepo.findOne.mockResolvedValue(null);
      candidateService.create.mockResolvedValue({ id: 555 } as Candidate);

      await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Engineer application",
      );

      expect(workflowAutomationService.processCandidateCv).toHaveBeenCalledWith(555);
    });

    it("handles candidate creation errors gracefully", async () => {
      jobPostingRepo.find.mockResolvedValue([
        {
          id: 60,
          title: "Manager",
          emailSubjectPattern: null,
          status: JobPostingStatus.ACTIVE,
        } as JobPosting,
      ]);
      candidateRepo.findOne.mockResolvedValue(null);
      candidateService.create.mockRejectedValue(new Error("DB error"));

      const result = await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "Manager role",
      );

      expect(result.linkedEntityType).toBeNull();
      expect(result.extractionTriggered).toBe(false);
    });

    it("only queries active job postings", async () => {
      jobPostingRepo.find.mockResolvedValue([]);

      await service.route(
        buildAttachment(),
        Buffer.from(""),
        1,
        "candidate@example.com",
        "subject",
      );

      expect(jobPostingRepo.find).toHaveBeenCalledWith({
        where: { companyId: 1, status: JobPostingStatus.ACTIVE },
      });
    });
  });
});
