import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard, JobCardWorkflowStatus } from "../entities/job-card.entity";
import { JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardDocument } from "../entities/job-card-document.entity";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { JobCardWorkflowService } from "./job-card-workflow.service";
import { RequisitionService } from "./requisition.service";
import { SignatureService } from "./signature.service";
import { WorkflowNotificationService } from "./workflow-notification.service";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

describe("JobCardWorkflowService", () => {
  let service: JobCardWorkflowService;

  const mockJobCardRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn(),
  };

  const mockApprovalRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockDocumentRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue({
      url: "https://s3.example.com/file.pdf",
      path: "stock-control/file.pdf",
      originalFilename: "file.pdf",
      mimeType: "application/pdf",
      size: 1000,
    }),
  };

  const mockSignatureService = {
    uploadSignature: jest.fn().mockResolvedValue({ signatureUrl: "https://sig.url" }),
    signatureUrl: jest.fn().mockResolvedValue("https://existing-sig.url"),
    findByUser: jest.fn().mockResolvedValue({ signatureUrl: "https://existing-sig.url" }),
  };

  const mockNotificationService = {
    notifyApprovalRequired: jest.fn().mockResolvedValue(undefined),
    notifyApprovalCompleted: jest.fn().mockResolvedValue(undefined),
    notifyRejection: jest.fn().mockResolvedValue(undefined),
    notifyDispatchReady: jest.fn().mockResolvedValue(undefined),
    markJobCardNotificationsAsRead: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequisitionService = {
    createFromJobCard: jest.fn().mockResolvedValue(null),
  };

  const mockStepConfigService = {
    backgroundStepsForTrigger: jest.fn().mockResolvedValue([]),
  };

  function makeUser(role: StockControlRole) {
    return { id: 1, companyId: 1, name: "Test User", role };
  }

  function makeJobCard(status: JobCardWorkflowStatus) {
    return { id: 1, companyId: 1, jobNumber: "JC-001", workflowStatus: status };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCardWorkflowService,
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardApproval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(JobCardDocument), useValue: mockDocumentRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: SignatureService, useValue: mockSignatureService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: WorkflowStepConfigService, useValue: mockStepConfigService },
      ],
    }).compile();

    service = module.get<JobCardWorkflowService>(JobCardWorkflowService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("state transitions", () => {
    const transitions: [JobCardWorkflowStatus, StockControlRole, JobCardWorkflowStatus][] = [
      [
        JobCardWorkflowStatus.DOCUMENT_UPLOADED,
        StockControlRole.ADMIN,
        JobCardWorkflowStatus.ADMIN_APPROVED,
      ],
      [
        JobCardWorkflowStatus.ADMIN_APPROVED,
        StockControlRole.MANAGER,
        JobCardWorkflowStatus.MANAGER_APPROVED,
      ],
      [
        JobCardWorkflowStatus.MANAGER_APPROVED,
        StockControlRole.MANAGER,
        JobCardWorkflowStatus.REQUISITION_SENT,
      ],
      [
        JobCardWorkflowStatus.REQUISITION_SENT,
        StockControlRole.STOREMAN,
        JobCardWorkflowStatus.STOCK_ALLOCATED,
      ],
      [
        JobCardWorkflowStatus.STOCK_ALLOCATED,
        StockControlRole.MANAGER,
        JobCardWorkflowStatus.MANAGER_FINAL,
      ],
      [
        JobCardWorkflowStatus.MANAGER_FINAL,
        StockControlRole.STOREMAN,
        JobCardWorkflowStatus.READY_FOR_DISPATCH,
      ],
      [
        JobCardWorkflowStatus.READY_FOR_DISPATCH,
        StockControlRole.STOREMAN,
        JobCardWorkflowStatus.DISPATCHED,
      ],
    ];

    transitions.forEach(([fromStatus, role, toStatus]) => {
      it(`${fromStatus} -> ${toStatus} (${role})`, async () => {
        const jobCard = makeJobCard(fromStatus);
        mockJobCardRepo.findOne.mockResolvedValue(jobCard);

        await service.approveStep(1, 1, makeUser(role), {});

        expect(mockJobCardRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ workflowStatus: toStatus }),
        );
      });
    });
  });

  describe("admin can approve any step", () => {
    it("admin approves manager step", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.ADMIN_APPROVED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.approveStep(1, 1, makeUser(StockControlRole.ADMIN), {}),
      ).resolves.toBeDefined();

      expect(mockJobCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ workflowStatus: JobCardWorkflowStatus.MANAGER_APPROVED }),
      );
    });

    it("admin approves storeman step", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.REQUISITION_SENT);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.approveStep(1, 1, makeUser(StockControlRole.ADMIN), {}),
      ).resolves.toBeDefined();
    });
  });

  describe("role validation", () => {
    it("throws ForbiddenException when wrong role tries to approve", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DOCUMENT_UPLOADED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.approveStep(1, 1, makeUser(StockControlRole.STOREMAN), {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when accounts tries to approve", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DOCUMENT_UPLOADED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.approveStep(1, 1, makeUser(StockControlRole.ACCOUNTS), {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("manager cannot approve admin step", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DOCUMENT_UPLOADED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.approveStep(1, 1, makeUser(StockControlRole.MANAGER), {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("approveStep", () => {
    it("throws BadRequestException when DRAFT (not approvable)", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DRAFT);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(service.approveStep(1, 1, makeUser(StockControlRole.ADMIN), {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when already DISPATCHED", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DISPATCHED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(service.approveStep(1, 1, makeUser(StockControlRole.ADMIN), {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFoundException when job card not found", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveStep(1, 999, makeUser(StockControlRole.ADMIN), {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("triggers requisition creation when reaching REQUISITION_SENT", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.MANAGER_APPROVED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await service.approveStep(1, 1, makeUser(StockControlRole.MANAGER), {});

      expect(mockRequisitionService.createFromJobCard).toHaveBeenCalledWith(1, 1, "Test User");
    });

    it("notifies dispatch ready when reaching READY_FOR_DISPATCH", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.MANAGER_FINAL);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await service.approveStep(1, 1, makeUser(StockControlRole.STOREMAN), {});

      expect(mockNotificationService.notifyDispatchReady).toHaveBeenCalledWith(1, 1);
    });

    it("uploads signature when signatureDataUrl provided", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DOCUMENT_UPLOADED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await service.approveStep(1, 1, makeUser(StockControlRole.ADMIN), {
        signatureDataUrl: "data:image/png;base64,abc",
      });

      expect(mockSignatureService.uploadSignature).toHaveBeenCalledWith(
        1,
        1,
        "data:image/png;base64,abc",
      );
    });
  });

  describe("rejectStep", () => {
    it("resets status to DOCUMENT_UPLOADED", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.ADMIN_APPROVED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await service.rejectStep(1, 1, makeUser(StockControlRole.ADMIN), "Wrong docs");

      expect(mockJobCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ workflowStatus: JobCardWorkflowStatus.DOCUMENT_UPLOADED }),
      );
    });

    it("only admin or manager can reject", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.REQUISITION_SENT);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.rejectStep(1, 1, makeUser(StockControlRole.STOREMAN), "reason"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException when DRAFT", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DRAFT);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(
        service.rejectStep(1, 1, makeUser(StockControlRole.ADMIN), "reason"),
      ).rejects.toThrow(BadRequestException);
    });

    it("notifies about rejection", async () => {
      const jobCard = makeJobCard(JobCardWorkflowStatus.DOCUMENT_UPLOADED);
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await service.rejectStep(1, 1, makeUser(StockControlRole.ADMIN), "Bad quality");

      expect(mockNotificationService.notifyRejection).toHaveBeenCalled();
    });
  });

  describe("pendingApprovalsForUser", () => {
    it("returns empty for ACCOUNTS role", async () => {
      const result = await service.pendingApprovalsForUser(makeUser(StockControlRole.ACCOUNTS));
      expect(result).toEqual([]);
    });

    it("queries correct statuses for ADMIN", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.pendingApprovalsForUser(makeUser(StockControlRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        "jc.workflowStatus IN (:...statuses)",
        expect.objectContaining({
          statuses: expect.arrayContaining([
            JobCardWorkflowStatus.DOCUMENT_UPLOADED,
            JobCardWorkflowStatus.ADMIN_APPROVED,
            JobCardWorkflowStatus.MANAGER_APPROVED,
            JobCardWorkflowStatus.STOCK_ALLOCATED,
          ]),
        }),
      );
    });

    it("queries correct statuses for MANAGER", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.pendingApprovalsForUser(makeUser(StockControlRole.MANAGER));

      expect(qb.andWhere).toHaveBeenCalledWith(
        "jc.workflowStatus IN (:...statuses)",
        expect.objectContaining({
          statuses: expect.arrayContaining([
            JobCardWorkflowStatus.ADMIN_APPROVED,
            JobCardWorkflowStatus.MANAGER_APPROVED,
            JobCardWorkflowStatus.STOCK_ALLOCATED,
          ]),
        }),
      );
    });

    it("queries correct statuses for STOREMAN", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.pendingApprovalsForUser(makeUser(StockControlRole.STOREMAN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        "jc.workflowStatus IN (:...statuses)",
        expect.objectContaining({
          statuses: expect.arrayContaining([
            JobCardWorkflowStatus.REQUISITION_SENT,
            JobCardWorkflowStatus.READY_FOR_DISPATCH,
          ]),
        }),
      );
    });
  });
});
