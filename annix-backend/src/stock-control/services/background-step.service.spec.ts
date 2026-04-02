import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCard } from "../entities/job-card.entity";
import { JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { BackgroundStepService } from "./background-step.service";
import { JobCardWorkflowService } from "./job-card-workflow.service";
import { JobFileService } from "./job-file.service";
import { QaProcessService } from "./qa-process.service";
import { ReconciliationDocumentService } from "./reconciliation-document.service";
import { WorkflowNotificationService } from "./workflow-notification.service";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

describe("BackgroundStepService", () => {
  let service: BackgroundStepService;

  const mockCompletionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve(
          Array.isArray(entity)
            ? entity.map((e, i) => ({ id: i + 10, ...e }))
            : { id: 1, ...entity },
        ),
      ),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
  };

  const mockApprovalRepo = {
    findOne: jest.fn(),
  };

  const mockNotificationRepo = {
    find: jest.fn(),
  };

  const mockStepConfigService = {
    backgroundSteps: jest.fn(),
    backgroundStepsForTrigger: jest.fn(),
  };

  const mockNotificationService = {
    notifyBackgroundStepCompleted: jest.fn().mockResolvedValue(null),
    notifyBackgroundStepRequired: jest.fn().mockResolvedValue(null),
  };

  const mockWorkflowService = {
    advancePastBackgroundSteps: jest.fn().mockResolvedValue(null),
  };

  const mockJobFileService = {
    hasImageFiles: jest.fn(),
  };

  const mockQaProcessService = {
    autoSkipInapplicableSteps: jest.fn().mockResolvedValue(null),
    resetReviewAfterRepairs: jest.fn().mockResolvedValue(false),
    autoCompileDataBook: jest.fn().mockResolvedValue(null),
  };

  const mockReconciliationDocService = {
    gateStatus: jest.fn(),
  };

  const mockUser = { id: 1, companyId: 1, name: "Test User" };

  function makeStepConfig(overrides: Record<string, unknown> = {}) {
    return {
      key: "reception",
      label: "Reception",
      triggerAfterStep: null,
      branchColor: null,
      actionLabel: null,
      stepOutcomes: null,
      rejoinAtStep: null,
      ...overrides,
    };
  }

  function makeCompletion(
    overrides: Partial<JobCardBackgroundCompletion> = {},
  ): Partial<JobCardBackgroundCompletion> {
    return {
      id: 1,
      companyId: 1,
      jobCardId: 1,
      stepKey: "reception",
      completedById: 1,
      completedByName: "Test User",
      completedAt: new Date("2026-01-15T10:00:00Z"),
      notes: null,
      completionType: "manual",
      createdAt: new Date("2026-01-15T10:00:00Z"),
      ...overrides,
    };
  }

  function makeNotification(
    overrides: Partial<WorkflowNotification> = {},
  ): Partial<WorkflowNotification> {
    return {
      id: 1,
      userId: 1,
      companyId: 1,
      jobCardId: 1,
      title: "Step required",
      message: "Background step [step:reception] is required",
      actionType: NotificationActionType.BACKGROUND_STEP_REQUIRED,
      readAt: null,
      createdAt: new Date("2026-01-15T10:00:00Z"),
      jobCard: { id: 1, jobNumber: "JC-001" } as JobCard,
      ...overrides,
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundStepService,
        { provide: getRepositoryToken(JobCardBackgroundCompletion), useValue: mockCompletionRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardApproval), useValue: mockApprovalRepo },
        { provide: getRepositoryToken(WorkflowNotification), useValue: mockNotificationRepo },
        { provide: WorkflowStepConfigService, useValue: mockStepConfigService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
        { provide: JobCardWorkflowService, useValue: mockWorkflowService },
        { provide: JobFileService, useValue: mockJobFileService },
        { provide: QaProcessService, useValue: mockQaProcessService },
        { provide: ReconciliationDocumentService, useValue: mockReconciliationDocService },
      ],
    }).compile();

    service = module.get<BackgroundStepService>(BackgroundStepService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("completeStep", () => {
    it("creates a completion record for a valid background step", async () => {
      const stepConfig = makeStepConfig();
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      const result = await service.completeStep(1, 1, "reception", mockUser);

      expect(mockCompletionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          jobCardId: 1,
          stepKey: "reception",
          completedById: 1,
          completedByName: "Test User",
          notes: null,
          completionType: "manual",
        }),
      );
      expect(mockCompletionRepo.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ stepKey: "reception" }));
    });

    it("saves notes when provided", async () => {
      const stepConfig = makeStepConfig();
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await service.completeStep(1, 1, "reception", mockUser, "Some notes");

      expect(mockCompletionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "Some notes" }),
      );
    });

    it("throws NotFoundException when step key is not a valid background step", async () => {
      mockStepConfigService.backgroundSteps.mockResolvedValue([]);

      await expect(service.completeStep(1, 1, "nonexistent", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when step is already completed", async () => {
      const stepConfig = makeStepConfig();
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(makeCompletion());

      await expect(service.completeStep(1, 1, "reception", mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when outcomes are required but none provided", async () => {
      const stepConfig = makeStepConfig({
        key: "qa_check",
        label: "QA Check",
        stepOutcomes: [
          { key: "pass", label: "Pass", nextStepKey: null, notifyStepKey: null, style: "success" },
          { key: "fail", label: "Fail", nextStepKey: null, notifyStepKey: null, style: "danger" },
        ],
      });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await expect(service.completeStep(1, 1, "qa_check", mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when provided outcomeKey does not match any outcome", async () => {
      const stepConfig = makeStepConfig({
        key: "qa_check",
        label: "QA Check",
        stepOutcomes: [
          { key: "pass", label: "Pass", nextStepKey: null, notifyStepKey: null, style: "success" },
        ],
      });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeStep(1, 1, "qa_check", mockUser, undefined, "invalid_outcome"),
      ).rejects.toThrow(BadRequestException);
    });

    it("sets completionType to the chosen outcome key", async () => {
      const stepConfig = makeStepConfig({
        key: "qa_check",
        label: "QA Check",
        stepOutcomes: [
          { key: "pass", label: "Pass", nextStepKey: null, notifyStepKey: null, style: "success" },
        ],
      });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await service.completeStep(1, 1, "qa_check", mockUser, undefined, "pass");

      expect(mockCompletionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ completionType: "pass" }),
      );
    });

    it("sends a completion notification", async () => {
      const stepConfig = makeStepConfig();
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await service.completeStep(1, 1, "reception", mockUser);

      expect(mockNotificationService.notifyBackgroundStepCompleted).toHaveBeenCalledWith(
        1,
        1,
        "reception",
        "Reception",
        { id: 1, name: "Test User" },
      );
    });

    it("throws BadRequestException when previous step in branch is not completed", async () => {
      const steps = [
        makeStepConfig({
          key: "step_a",
          label: "Step A",
          triggerAfterStep: "fabrication",
          branchColor: "blue",
        }),
        makeStepConfig({
          key: "step_b",
          label: "Step B",
          triggerAfterStep: "fabrication",
          branchColor: "blue",
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);

      await expect(service.completeStep(1, 1, "step_b", mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("allows completing a step when previous step in branch is done", async () => {
      const steps = [
        makeStepConfig({
          key: "step_a",
          label: "Step A",
          triggerAfterStep: "fabrication",
          branchColor: "blue",
        }),
        makeStepConfig({
          key: "step_b",
          label: "Step B",
          triggerAfterStep: "fabrication",
          branchColor: "blue",
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);
      mockCompletionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeCompletion({ stepKey: "step_a" }));
      mockCompletionRepo.find.mockResolvedValue([
        makeCompletion({ stepKey: "step_a" }),
        makeCompletion({ stepKey: "step_b" }),
      ]);

      const result = await service.completeStep(1, 1, "step_b", mockUser);

      expect(result).toEqual(expect.objectContaining({ stepKey: "step_b" }));
    });

    it("throws BadRequestException for compile_data_book when no photos uploaded", async () => {
      const stepConfig = makeStepConfig({ key: "compile_data_book", label: "Compile Data Book" });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockJobFileService.hasImageFiles.mockResolvedValue(false);

      await expect(service.completeStep(1, 1, "compile_data_book", mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("allows compile_data_book when photos are uploaded", async () => {
      const stepConfig = makeStepConfig({ key: "compile_data_book", label: "Compile Data Book" });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockJobFileService.hasImageFiles.mockResolvedValue(true);

      await service.completeStep(1, 1, "compile_data_book", mockUser);

      expect(mockQaProcessService.autoCompileDataBook).toHaveBeenCalledWith(1, 1, mockUser);
    });

    it("throws BadRequestException for job_file_review when gate is not satisfied", async () => {
      const stepConfig = makeStepConfig({ key: "job_file_review", label: "Job File Review" });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockReconciliationDocService.gateStatus.mockResolvedValue({ satisfied: false });

      await expect(service.completeStep(1, 1, "job_file_review", mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("allows job_file_review when gate is satisfied", async () => {
      const stepConfig = makeStepConfig({ key: "job_file_review", label: "Job File Review" });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockReconciliationDocService.gateStatus.mockResolvedValue({ satisfied: true });

      const result = await service.completeStep(1, 1, "job_file_review", mockUser);

      expect(result).toEqual(expect.objectContaining({ stepKey: "job_file_review" }));
    });

    describe("auto-skip requisition chain when SOH", () => {
      it("auto-skips requisition chain when reception is completed and PM approved with SOH", async () => {
        const receptionStep = makeStepConfig({ key: "reception", label: "Reception" });
        const requisitionStep = makeStepConfig({ key: "requisition", label: "Requisition" });
        const reqAuthStep = makeStepConfig({ key: "req_auth", label: "Req Auth" });
        const orderStep = makeStepConfig({ key: "order_placement", label: "Order Placement" });

        mockStepConfigService.backgroundSteps
          .mockResolvedValueOnce([receptionStep, requisitionStep, reqAuthStep, orderStep])
          .mockResolvedValueOnce([receptionStep, requisitionStep, reqAuthStep, orderStep]);
        mockCompletionRepo.findOne.mockResolvedValue(null);
        mockApprovalRepo.findOne.mockResolvedValue({ outcomeKey: "soh" });
        mockCompletionRepo.find.mockResolvedValue([]);

        await service.completeStep(1, 1, "reception", mockUser);

        expect(mockCompletionRepo.save).toHaveBeenCalledTimes(2);
        const secondSaveCall = mockCompletionRepo.save.mock.calls[1][0];
        expect(secondSaveCall).toHaveLength(3);
        expect(secondSaveCall[0]).toEqual(
          expect.objectContaining({ stepKey: "requisition", completionType: "skipped" }),
        );
        expect(secondSaveCall[1]).toEqual(
          expect.objectContaining({ stepKey: "req_auth", completionType: "skipped" }),
        );
        expect(secondSaveCall[2]).toEqual(
          expect.objectContaining({ stepKey: "order_placement", completionType: "skipped" }),
        );
      });

      it("does not skip requisition chain when PM outcome is not SOH", async () => {
        const receptionStep = makeStepConfig({ key: "reception", label: "Reception" });
        mockStepConfigService.backgroundSteps.mockResolvedValue([receptionStep]);
        mockCompletionRepo.findOne.mockResolvedValue(null);
        mockApprovalRepo.findOne.mockResolvedValue({ outcomeKey: "fabricate" });

        await service.completeStep(1, 1, "reception", mockUser);

        expect(mockCompletionRepo.save).toHaveBeenCalledTimes(1);
      });

      it("does not skip already-completed requisition steps", async () => {
        const receptionStep = makeStepConfig({ key: "reception", label: "Reception" });
        const requisitionStep = makeStepConfig({ key: "requisition", label: "Requisition" });

        mockStepConfigService.backgroundSteps
          .mockResolvedValueOnce([receptionStep, requisitionStep])
          .mockResolvedValueOnce([receptionStep, requisitionStep]);
        mockCompletionRepo.findOne.mockResolvedValue(null);
        mockApprovalRepo.findOne.mockResolvedValue({ outcomeKey: "soh" });
        mockCompletionRepo.find.mockResolvedValue([makeCompletion({ stepKey: "requisition" })]);

        await service.completeStep(1, 1, "reception", mockUser);

        expect(mockCompletionRepo.save).toHaveBeenCalledTimes(1);
      });
    });

    it("calls autoSkipInapplicableSteps when qa_check is completed", async () => {
      const stepConfig = makeStepConfig({ key: "qa_check", label: "QA Check", stepOutcomes: [] });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await service.completeStep(1, 1, "qa_check", mockUser);

      expect(mockQaProcessService.autoSkipInapplicableSteps).toHaveBeenCalledWith(1, 1, mockUser);
    });

    it("calls resetReviewAfterRepairs when qc_repairs is completed", async () => {
      const stepConfig = makeStepConfig({
        key: "qc_repairs",
        label: "QC Repairs",
        stepOutcomes: [],
      });
      mockStepConfigService.backgroundSteps.mockResolvedValue([stepConfig]);
      mockCompletionRepo.findOne.mockResolvedValue(null);

      await service.completeStep(1, 1, "qc_repairs", mockUser);

      expect(mockQaProcessService.resetReviewAfterRepairs).toHaveBeenCalledWith(1, 1);
    });

    it("triggers next step notification when completing a step in a trigger chain", async () => {
      const steps = [
        makeStepConfig({
          key: "step_a",
          label: "Step A",
          triggerAfterStep: "fabrication",
          branchColor: null,
        }),
        makeStepConfig({
          key: "step_b",
          label: "Step B",
          triggerAfterStep: "fabrication",
          branchColor: null,
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockCompletionRepo.find.mockResolvedValue([makeCompletion({ stepKey: "step_a" })]);

      await service.completeStep(1, 1, "step_a", mockUser);

      expect(mockNotificationService.notifyBackgroundStepRequired).toHaveBeenCalledWith(
        1,
        1,
        "step_b",
        "Step B",
        { id: 1, name: "Test User" },
      );
    });

    it("advances foreground when all siblings in a trigger group are complete", async () => {
      const steps = [
        makeStepConfig({
          key: "step_a",
          label: "Step A",
          triggerAfterStep: "fabrication",
          branchColor: null,
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockCompletionRepo.find.mockResolvedValue([makeCompletion({ stepKey: "step_a" })]);

      await service.completeStep(1, 1, "step_a", mockUser);

      expect(mockWorkflowService.advancePastBackgroundSteps).toHaveBeenCalledWith(1, 1, {
        id: 1,
        name: "Test User",
      });
    });

    it("does not advance foreground when some siblings are still incomplete", async () => {
      const steps = [
        makeStepConfig({
          key: "step_a",
          label: "Step A",
          triggerAfterStep: "fabrication",
          branchColor: null,
        }),
        makeStepConfig({
          key: "step_b",
          label: "Step B",
          triggerAfterStep: "fabrication",
          branchColor: null,
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockCompletionRepo.find.mockResolvedValue([makeCompletion({ stepKey: "step_a" })]);

      await service.completeStep(1, 1, "step_a", mockUser);

      expect(mockWorkflowService.advancePastBackgroundSteps).not.toHaveBeenCalled();
    });

    it("routes to notifyStepKey when outcome has one", async () => {
      const steps = [
        makeStepConfig({
          key: "qa_check",
          label: "QA Check",
          triggerAfterStep: "fabrication",
          stepOutcomes: [
            {
              key: "fail",
              label: "Fail",
              nextStepKey: null,
              notifyStepKey: "qc_repairs",
              style: "danger",
            },
          ],
        }),
        makeStepConfig({ key: "qc_repairs", label: "QC Repairs", triggerAfterStep: "fabrication" }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockStepConfigService.backgroundStepsForTrigger.mockResolvedValue(steps);
      mockCompletionRepo.findOne.mockResolvedValue(null);
      mockCompletionRepo.find.mockResolvedValue([]);

      await service.completeStep(1, 1, "qa_check", mockUser, undefined, "fail");

      expect(mockNotificationService.notifyBackgroundStepRequired).toHaveBeenCalledWith(
        1,
        1,
        "qc_repairs",
        "QC Repairs",
        { id: 1, name: "Test User" },
      );
    });
  });

  describe("completeMultipleSteps", () => {
    it("creates completions for multiple valid steps at once", async () => {
      const steps = [
        makeStepConfig({ key: "step_a", label: "Step A" }),
        makeStepConfig({ key: "step_b", label: "Step B" }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          makeCompletion({ stepKey: "step_a" }),
          makeCompletion({ stepKey: "step_b" }),
        ]);

      await service.completeMultipleSteps(1, 1, ["step_a", "step_b"], mockUser, "Batch notes");

      expect(mockCompletionRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ stepKey: "step_a", notes: "Batch notes" }),
          expect.objectContaining({ stepKey: "step_b", notes: "Batch notes" }),
        ]),
      );
    });

    it("skips steps that are already completed", async () => {
      const steps = [
        makeStepConfig({ key: "step_a", label: "Step A" }),
        makeStepConfig({ key: "step_b", label: "Step B" }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })])
        .mockResolvedValueOnce([
          makeCompletion({ stepKey: "step_a" }),
          makeCompletion({ stepKey: "step_b" }),
        ]);

      await service.completeMultipleSteps(1, 1, ["step_a", "step_b"], mockUser);

      expect(mockCompletionRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ stepKey: "step_b" })]),
      );
      const savedEntities = mockCompletionRepo.save.mock.calls[0][0];
      expect(savedEntities).toHaveLength(1);
    });

    it("skips step keys that are not valid background steps", async () => {
      const steps = [makeStepConfig({ key: "step_a", label: "Step A" })];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })]);

      await service.completeMultipleSteps(1, 1, ["step_a", "invalid_step"], mockUser);

      const savedEntities = mockCompletionRepo.save.mock.calls[0][0];
      expect(savedEntities).toHaveLength(1);
      expect(savedEntities[0]).toEqual(expect.objectContaining({ stepKey: "step_a" }));
    });

    it("does not call save when all steps are already completed", async () => {
      const steps = [makeStepConfig({ key: "step_a", label: "Step A" })];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })])
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })]);

      await service.completeMultipleSteps(1, 1, ["step_a"], mockUser);

      expect(mockCompletionRepo.save).not.toHaveBeenCalled();
    });

    it("advances foreground when all trigger groups are complete after batch", async () => {
      const steps = [
        makeStepConfig({ key: "step_a", label: "Step A", triggerAfterStep: "fabrication" }),
        makeStepConfig({ key: "step_b", label: "Step B", triggerAfterStep: "fabrication" }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          makeCompletion({ stepKey: "step_a" }),
          makeCompletion({ stepKey: "step_b" }),
        ]);

      await service.completeMultipleSteps(1, 1, ["step_a", "step_b"], mockUser);

      expect(mockWorkflowService.advancePastBackgroundSteps).toHaveBeenCalledWith(1, 1, {
        id: 1,
        name: "Test User",
      });
    });

    it("does not advance foreground when some trigger groups are incomplete", async () => {
      const steps = [
        makeStepConfig({ key: "step_a", label: "Step A", triggerAfterStep: "fabrication" }),
        makeStepConfig({ key: "step_b", label: "Step B", triggerAfterStep: "fabrication" }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })]);

      await service.completeMultipleSteps(1, 1, ["step_a"], mockUser);

      expect(mockWorkflowService.advancePastBackgroundSteps).not.toHaveBeenCalled();
    });

    it("sets notes to null when not provided", async () => {
      const steps = [makeStepConfig({ key: "step_a", label: "Step A" })];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeCompletion({ stepKey: "step_a" })]);

      await service.completeMultipleSteps(1, 1, ["step_a"], mockUser);

      expect(mockCompletionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
    });
  });

  describe("statusForJobCard", () => {
    it("returns status for all background steps with completion data merged", async () => {
      const steps = [
        makeStepConfig({ key: "reception", label: "Reception" }),
        makeStepConfig({ key: "requisition", label: "Requisition" }),
      ];
      const completionDate = new Date("2026-01-15T10:00:00Z");
      const completions = [
        makeCompletion({
          stepKey: "reception",
          completedAt: completionDate,
          completedByName: "Test User",
          notes: "Done",
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find.mockResolvedValue(completions);

      const result = await service.statusForJobCard(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stepKey: "reception",
        label: "Reception",
        triggerAfterStep: null,
        completedAt: completionDate.toISOString(),
        completedByName: "Test User",
        notes: "Done",
        completionType: "manual",
        branchColor: null,
        actionLabel: null,
        stepOutcomes: null,
        rejoinAtStep: null,
      });
      expect(result[1]).toEqual(
        expect.objectContaining({
          stepKey: "requisition",
          completedAt: null,
          completedByName: null,
          notes: null,
          completionType: null,
        }),
      );
    });

    it("returns empty array when no background steps are configured", async () => {
      mockStepConfigService.backgroundSteps.mockResolvedValue([]);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.statusForJobCard(1, 1);

      expect(result).toEqual([]);
    });

    it("includes branchColor and stepOutcomes from config", async () => {
      const outcomes = [
        { key: "pass", label: "Pass", nextStepKey: null, notifyStepKey: null, style: "success" },
      ];
      const steps = [
        makeStepConfig({
          key: "qa_check",
          label: "QA Check",
          branchColor: "green",
          stepOutcomes: outcomes,
          rejoinAtStep: "dispatch",
        }),
      ];
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.statusForJobCard(1, 1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          branchColor: "green",
          stepOutcomes: outcomes,
          rejoinAtStep: "dispatch",
        }),
      );
    });
  });

  describe("pendingForUser", () => {
    it("returns pending steps from unread notifications that are not yet completed", async () => {
      const notifications = [
        makeNotification({
          id: 1,
          jobCardId: 1,
          message: "Background step [step:reception] is required",
          jobCard: { id: 1, jobNumber: "JC-001" } as JobCard,
          createdAt: new Date("2026-01-15T10:00:00Z"),
        }),
      ];
      const steps = [makeStepConfig({ key: "reception", label: "Reception" })];
      mockNotificationRepo.find.mockResolvedValue(notifications);
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        jobCardId: 1,
        jobCardNumber: "JC-001",
        stepKey: "reception",
        stepLabel: "Reception",
        triggeredAt: new Date("2026-01-15T10:00:00Z").toISOString(),
      });
    });

    it("filters out notifications for steps that are already completed", async () => {
      const notifications = [
        makeNotification({
          id: 1,
          jobCardId: 1,
          message: "Background step [step:reception] is required",
        }),
      ];
      mockNotificationRepo.find.mockResolvedValue(notifications);
      mockStepConfigService.backgroundSteps.mockResolvedValue([
        makeStepConfig({ key: "reception", label: "Reception" }),
      ]);
      mockCompletionRepo.find.mockResolvedValue([
        makeCompletion({ jobCardId: 1, stepKey: "reception" }),
      ]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toHaveLength(0);
    });

    it("returns empty array when user has no unread notifications", async () => {
      mockNotificationRepo.find.mockResolvedValue([]);
      mockStepConfigService.backgroundSteps.mockResolvedValue([]);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toEqual([]);
    });

    it("filters out notifications with no extractable step key", async () => {
      const notifications = [
        makeNotification({
          id: 1,
          jobCardId: 1,
          message: "Some notification without step key",
        }),
      ];
      mockNotificationRepo.find.mockResolvedValue(notifications);
      mockStepConfigService.backgroundSteps.mockResolvedValue([]);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toHaveLength(0);
    });

    it("uses step label from config, falling back to step key", async () => {
      const notifications = [
        makeNotification({
          id: 1,
          jobCardId: 1,
          message: "Background step [step:unknown_step] is required",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        }),
      ];
      mockNotificationRepo.find.mockResolvedValue(notifications);
      mockStepConfigService.backgroundSteps.mockResolvedValue([]);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].stepLabel).toBe("unknown_step");
    });

    it("handles multiple pending steps across different job cards", async () => {
      const notifications = [
        makeNotification({
          id: 1,
          jobCardId: 1,
          message: "Background step [step:reception] is required",
          jobCard: { id: 1, jobNumber: "JC-001" } as JobCard,
          createdAt: new Date("2026-01-16T10:00:00Z"),
        }),
        makeNotification({
          id: 2,
          jobCardId: 2,
          message: "Background step [step:requisition] is required",
          jobCard: { id: 2, jobNumber: "JC-002" } as JobCard,
          createdAt: new Date("2026-01-15T10:00:00Z"),
        }),
      ];
      const steps = [
        makeStepConfig({ key: "reception", label: "Reception" }),
        makeStepConfig({ key: "requisition", label: "Requisition" }),
      ];
      mockNotificationRepo.find.mockResolvedValue(notifications);
      mockStepConfigService.backgroundSteps.mockResolvedValue(steps);
      mockCompletionRepo.find.mockResolvedValue([]);

      const result = await service.pendingForUser(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].jobCardNumber).toBe("JC-001");
      expect(result[1].jobCardNumber).toBe("JC-002");
    });
  });
});
