import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { WorkflowStepConfigRepository } from "../repositories/workflow-step-config.repository";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

const COMPANY_ID = 1;

const createStep = (overrides: Partial<WorkflowStepConfig> = {}): WorkflowStepConfig =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    key: "admin_approval",
    label: "Admin",
    sortOrder: 1,
    isSystem: true,
    isBackground: false,
    triggerAfterStep: null,
    actionLabel: "Accept JC",
    branchColor: null,
    phaseActionLabels: null,
    stepOutcomes: null,
    branchType: null,
    rejoinAtStep: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as WorkflowStepConfig;

const createFgSteps = (): WorkflowStepConfig[] => [
  createStep({ id: 1, key: "admin_approval", label: "Admin", sortOrder: 1 }),
  createStep({ id: 2, key: "manager_approval", label: "Manager", sortOrder: 2 }),
  createStep({ id: 3, key: "quality_check", label: "Quality", sortOrder: 3 }),
  createStep({ id: 4, key: "dispatched", label: "Dispatched", sortOrder: 4 }),
];

const createBgSteps = (): WorkflowStepConfig[] => [
  createStep({
    id: 10,
    key: "document_upload",
    label: "Doc Upload",
    sortOrder: 1,
    isBackground: true,
    triggerAfterStep: "admin_approval",
  }),
  createStep({
    id: 11,
    key: "stock_allocation",
    label: "Stock Alloc",
    sortOrder: 3,
    isBackground: true,
    triggerAfterStep: "admin_approval",
  }),
  createStep({
    id: 12,
    key: "reception",
    label: "Reception",
    sortOrder: 3,
    isBackground: true,
    triggerAfterStep: "manager_approval",
  }),
];

describe("WorkflowStepConfigService", () => {
  let service: WorkflowStepConfigService;

  const mockRepo = {
    findOrderedForeground: jest.fn(),
    findOrderedBackground: jest.fn(),
    findBackgroundForTrigger: jest.fn(),
    findForCompany: jest.fn(),
    findOneForCompanyByKey: jest.fn(),
    findOneForegroundForCompanyByKey: jest.fn(),
    insertManyIgnore: jest.fn().mockResolvedValue(undefined),
    updateByCompanyAndKey: jest.fn().mockResolvedValue(1),
    updateById: jest.fn().mockResolvedValue(undefined),
    updateTriggerAfterStep: jest.fn().mockResolvedValue(undefined),
    bumpSortOrderAfter: jest.fn().mockResolvedValue(undefined),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 99, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 99, ...entity })),
    saveForCompany: jest
      .fn()
      .mockImplementation((_companyId, entity) => Promise.resolve({ id: 99, ...entity })),
    remove: jest.fn().mockResolvedValue({}),
    removeForCompany: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStepConfigService,
        { provide: WorkflowStepConfigRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WorkflowStepConfigService>(WorkflowStepConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("orderedSteps", () => {
    it("should return existing foreground steps when they exist", async () => {
      const steps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(steps);

      const result = await service.orderedSteps(COMPANY_ID);

      expect(result).toEqual(steps);
      expect(mockRepo.findOrderedForeground).toHaveBeenCalledWith(COMPANY_ID);
    });

    it("should seed defaults and re-fetch when no foreground steps exist", async () => {
      const seededSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValueOnce([]).mockResolvedValueOnce(seededSteps);

      const result = await service.orderedSteps(COMPANY_ID);

      expect(result).toEqual(seededSteps);
      expect(mockRepo.insertManyIgnore).toHaveBeenCalled();
      expect(mockRepo.findOrderedForeground).toHaveBeenCalledTimes(2);
    });
  });

  describe("backgroundSteps", () => {
    it("should return existing background steps when they exist", async () => {
      const steps = createBgSteps();
      mockRepo.findOrderedBackground.mockResolvedValue(steps);

      const result = await service.backgroundSteps(COMPANY_ID);

      expect(result).toEqual(steps);
      expect(mockRepo.findOrderedBackground).toHaveBeenCalledWith(COMPANY_ID);
    });

    it("should seed defaults and re-fetch when no background steps exist", async () => {
      const seededSteps = createBgSteps();
      mockRepo.findOrderedBackground.mockResolvedValueOnce([]).mockResolvedValueOnce(seededSteps);

      const result = await service.backgroundSteps(COMPANY_ID);

      expect(result).toEqual(seededSteps);
      expect(mockRepo.insertManyIgnore).toHaveBeenCalled();
      expect(mockRepo.findOrderedBackground).toHaveBeenCalledTimes(2);
    });
  });

  describe("backgroundStepsForTrigger", () => {
    it("should return background steps filtered by trigger step key", async () => {
      const adminBgSteps = createBgSteps().filter((s) => s.triggerAfterStep === "admin_approval");
      mockRepo.findBackgroundForTrigger.mockResolvedValue(adminBgSteps);

      const result = await service.backgroundStepsForTrigger(COMPANY_ID, "admin_approval");

      expect(result).toEqual(adminBgSteps);
      expect(mockRepo.findBackgroundForTrigger).toHaveBeenCalledWith(COMPANY_ID, "admin_approval");
    });

    it("should return empty array when no steps match the trigger", async () => {
      mockRepo.findBackgroundForTrigger.mockResolvedValue([]);

      const result = await service.backgroundStepsForTrigger(COMPANY_ID, "nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("seedDefaults", () => {
    it("should create default steps and insert them with orIgnore", async () => {
      await service.seedDefaults(COMPANY_ID);

      expect(mockRepo.insertManyIgnore).toHaveBeenCalled();
    });

    it("should create entities with the correct companyId", async () => {
      await service.seedDefaults(42);

      const insertedEntities = mockRepo.insertManyIgnore.mock.calls[0][0];
      const allMatchCompany = insertedEntities.every(
        (entity: { companyId: number }) => entity.companyId === 42,
      );
      expect(allMatchCompany).toBe(true);
    });

    it("should create both foreground and background steps", async () => {
      await service.seedDefaults(COMPANY_ID);

      const insertedEntities = mockRepo.insertManyIgnore.mock.calls[0][0];
      const hasForeground = insertedEntities.some(
        (entity: { isBackground: boolean }) => entity.isBackground === false,
      );
      const hasBackground = insertedEntities.some(
        (entity: { isBackground: boolean }) => entity.isBackground === true,
      );
      expect(hasForeground).toBe(true);
      expect(hasBackground).toBe(true);
    });
  });

  describe("addStep", () => {
    it("should add a foreground step after the specified step", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      const result = await service.addStep(COMPANY_ID, {
        label: "New Step",
        afterStepKey: "admin_approval",
      });

      expect(result.key).toBe("custom_new_step");
      expect(result.sortOrder).toBe(2);
      expect(result.isBackground).toBe(false);
      expect(result.isSystem).toBe(false);
    });

    it("should add a background step with triggerAfterStep", async () => {
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);

      const result = await service.addStep(COMPANY_ID, {
        label: "New BG Step",
        afterStepKey: "admin_approval",
        isBackground: true,
        triggerAfterStep: "admin_approval",
      });

      expect(result.key).toBe("custom_new_bg_step");
      expect(result.isBackground).toBe(true);
      expect(result.triggerAfterStep).toBe("admin_approval");
      expect(result.sortOrder).toBe(0);
    });

    it("should throw BadRequestException when a step with the same key already exists", async () => {
      mockRepo.findOneForCompanyByKey.mockResolvedValue(createStep({ key: "custom_duplicate" }));

      await expect(
        service.addStep(COMPANY_ID, {
          label: "Duplicate",
          afterStepKey: "admin_approval",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when afterStepKey is not found for foreground step", async () => {
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);
      mockRepo.findOrderedForeground.mockResolvedValue(createFgSteps());

      await expect(
        service.addStep(COMPANY_ID, {
          label: "New Step",
          afterStepKey: "nonexistent_step",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should shift sort orders of steps after the insertion point", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await service.addStep(COMPANY_ID, {
        label: "Inserted",
        afterStepKey: "admin_approval",
      });

      expect(mockRepo.bumpSortOrderAfter).toHaveBeenCalledWith(COMPANY_ID, 1);
    });
  });

  describe("removeStep", () => {
    it("should remove an existing step", async () => {
      const step = createStep({ key: "custom_step", isSystem: false });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);

      await service.removeStep(COMPANY_ID, "custom_step");

      expect(mockRepo.removeForCompany).toHaveBeenCalledWith(COMPANY_ID, step);
    });

    it("should throw NotFoundException when step does not exist", async () => {
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);

      await expect(service.removeStep(COMPANY_ID, "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should re-parent dependent background steps to the removed step parent", async () => {
      const step = createStep({
        key: "middle_step",
        triggerAfterStep: "admin_approval",
        isBackground: true,
      });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);

      await service.removeStep(COMPANY_ID, "middle_step");

      expect(mockRepo.updateTriggerAfterStep).toHaveBeenCalledWith(
        COMPANY_ID,
        "middle_step",
        "admin_approval",
      );
      expect(mockRepo.removeForCompany).toHaveBeenCalledWith(COMPANY_ID, step);
    });

    it("should re-parent dependent steps to null when removed step has no parent", async () => {
      const step = createStep({
        key: "root_step",
        triggerAfterStep: null,
      });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);

      await service.removeStep(COMPANY_ID, "root_step");

      expect(mockRepo.updateTriggerAfterStep).toHaveBeenCalledWith(COMPANY_ID, "root_step", null);
    });
  });

  describe("reorderStep", () => {
    it("should swap sort orders when moving a step up", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await service.reorderStep(COMPANY_ID, "manager_approval", "up");

      expect(mockRepo.updateById).toHaveBeenCalledWith(2, { sortOrder: 1 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(1, { sortOrder: 2 });
    });

    it("should swap sort orders when moving a step down", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await service.reorderStep(COMPANY_ID, "manager_approval", "down");

      expect(mockRepo.updateById).toHaveBeenCalledWith(2, { sortOrder: 3 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(3, { sortOrder: 2 });
    });

    it("should throw BadRequestException when moving the first step up", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await expect(service.reorderStep(COMPANY_ID, "admin_approval", "up")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when moving the last step down", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await expect(service.reorderStep(COMPANY_ID, "dispatched", "down")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when step key is not found", async () => {
      const fgSteps = createFgSteps();
      mockRepo.findOrderedForeground.mockResolvedValue(fgSteps);

      await expect(service.reorderStep(COMPANY_ID, "nonexistent", "up")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("bulkReorder", () => {
    it("should reorder steps according to the provided key list", async () => {
      const steps = createFgSteps();
      mockRepo.findForCompany.mockResolvedValue(steps);

      await service.bulkReorder(COMPANY_ID, [
        "dispatched",
        "quality_check",
        "manager_approval",
        "admin_approval",
      ]);

      expect(mockRepo.updateById).toHaveBeenCalledWith(4, { sortOrder: 1 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(3, { sortOrder: 2 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(2, { sortOrder: 3 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(1, { sortOrder: 4 });
    });

    it("should skip keys that do not match any existing step", async () => {
      const steps = createFgSteps();
      mockRepo.findForCompany.mockResolvedValue(steps);

      await service.bulkReorder(COMPANY_ID, [
        "admin_approval",
        "nonexistent_key",
        "manager_approval",
      ]);

      expect(mockRepo.updateById).toHaveBeenCalledWith(1, { sortOrder: 1 });
      expect(mockRepo.updateById).toHaveBeenCalledWith(2, { sortOrder: 3 });
      expect(mockRepo.updateById).toHaveBeenCalledTimes(2);
    });
  });

  describe("phasesForFgStep", () => {
    it("should return empty array when no background steps exist for the trigger", async () => {
      mockRepo.findBackgroundForTrigger.mockResolvedValue([]);

      const result = await service.phasesForFgStep(COMPANY_ID, "admin_approval");

      expect(result).toEqual([]);
    });

    it("should return single phase when all bg steps have the same branchColor", async () => {
      const bgSteps = [
        createStep({ id: 10, key: "qa_check", isBackground: true, branchColor: "#3b82f6" }),
        createStep({ id: 11, key: "qc_batch_certs", isBackground: true, branchColor: "#3b82f6" }),
      ];
      mockRepo.findBackgroundForTrigger.mockResolvedValue(bgSteps);

      const result = await service.phasesForFgStep(COMPANY_ID, "quality_check");

      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe(1);
      expect(result[0].bgStepKeys).toEqual(["qa_check", "qc_batch_certs"]);
    });

    it("should return single phase when all bg steps have null branchColor", async () => {
      const bgSteps = [
        createStep({ id: 10, key: "document_upload", isBackground: true, branchColor: null }),
        createStep({ id: 11, key: "stock_allocation", isBackground: true, branchColor: null }),
      ];
      mockRepo.findBackgroundForTrigger.mockResolvedValue(bgSteps);

      const result = await service.phasesForFgStep(COMPANY_ID, "admin_approval");

      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe(1);
      expect(result[0].branchColor).toBeNull();
      expect(result[0].bgStepKeys).toEqual(["document_upload", "stock_allocation"]);
    });

    it("should return two phases when bg steps have mixed branchColors", async () => {
      const bgSteps = [
        createStep({ id: 10, key: "qa_check", isBackground: true, branchColor: "#3b82f6" }),
        createStep({ id: 11, key: "compile_data_book", isBackground: true, branchColor: null }),
        createStep({ id: 12, key: "qc_batch_certs", isBackground: true, branchColor: "#3b82f6" }),
        createStep({ id: 13, key: "qa_review", isBackground: true, branchColor: null }),
      ];
      mockRepo.findBackgroundForTrigger.mockResolvedValue(bgSteps);

      const result = await service.phasesForFgStep(COMPANY_ID, "quality_check");

      expect(result).toHaveLength(2);
      expect(result[0].phase).toBe(1);
      expect(result[0].branchColor).toBe("#3b82f6");
      expect(result[0].bgStepKeys).toEqual(["qa_check", "qc_batch_certs"]);
      expect(result[1].phase).toBe(2);
      expect(result[1].branchColor).toBeNull();
      expect(result[1].bgStepKeys).toEqual(["compile_data_book", "qa_review"]);
    });
  });

  describe("firstStepPerBranch", () => {
    it("should return one step per unique branchColor", async () => {
      const steps = [
        createStep({ id: 1, key: "qa_check", branchColor: "#3b82f6" }),
        createStep({ id: 2, key: "qc_batch_certs", branchColor: "#3b82f6" }),
        createStep({ id: 3, key: "compile_data_book", branchColor: null }),
        createStep({ id: 4, key: "qa_review", branchColor: null }),
      ];

      const result = service.firstStepPerBranch(steps);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("qa_check");
      expect(result[1].key).toBe("compile_data_book");
    });

    it("should return empty array for empty input", async () => {
      const result = service.firstStepPerBranch([]);

      expect(result).toEqual([]);
    });

    it("should return all steps when each has a unique branchColor", async () => {
      const steps = [
        createStep({ id: 1, key: "step_a", branchColor: "#ff0000" }),
        createStep({ id: 2, key: "step_b", branchColor: "#00ff00" }),
        createStep({ id: 3, key: "step_c", branchColor: "#0000ff" }),
      ];

      const result = service.firstStepPerBranch(steps);

      expect(result).toHaveLength(3);
    });
  });

  describe("updateActionLabel", () => {
    it("should update the action label for an existing step", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(1);

      await service.updateActionLabel(COMPANY_ID, "admin_approval", "New Label");

      expect(mockRepo.updateByCompanyAndKey).toHaveBeenCalledWith(COMPANY_ID, "admin_approval", {
        actionLabel: "New Label",
      });
    });

    it("should allow setting action label to null", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(1);

      await service.updateActionLabel(COMPANY_ID, "admin_approval", null);

      expect(mockRepo.updateByCompanyAndKey).toHaveBeenCalledWith(COMPANY_ID, "admin_approval", {
        actionLabel: null,
      });
    });

    it("should throw NotFoundException when step does not exist", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(0);

      await expect(service.updateActionLabel(COMPANY_ID, "nonexistent", "Label")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateLabel", () => {
    it("should update the label for an existing step", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(1);

      await service.updateLabel(COMPANY_ID, "admin_approval", "Renamed");

      expect(mockRepo.updateByCompanyAndKey).toHaveBeenCalledWith(COMPANY_ID, "admin_approval", {
        label: "Renamed",
      });
    });

    it("should throw NotFoundException when step does not exist", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(0);

      await expect(service.updateLabel(COMPANY_ID, "nonexistent", "Label")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateBranchColor", () => {
    it("should update the branch color for an existing step", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(1);

      await service.updateBranchColor(COMPANY_ID, "qa_check", "#ff0000");

      expect(mockRepo.updateByCompanyAndKey).toHaveBeenCalledWith(COMPANY_ID, "qa_check", {
        branchColor: "#ff0000",
      });
    });

    it("should allow setting branch color to null", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(1);

      await service.updateBranchColor(COMPANY_ID, "qa_check", null);

      expect(mockRepo.updateByCompanyAndKey).toHaveBeenCalledWith(COMPANY_ID, "qa_check", {
        branchColor: null,
      });
    });

    it("should throw NotFoundException when step does not exist", async () => {
      mockRepo.updateByCompanyAndKey.mockResolvedValue(0);

      await expect(service.updateBranchColor(COMPANY_ID, "nonexistent", "#ff0000")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("toggleBackground", () => {
    it("should toggle a step to background with triggerAfterStep", async () => {
      const step = createStep({ key: "custom_step", isBackground: false });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);

      const result = await service.toggleBackground(
        COMPANY_ID,
        "custom_step",
        true,
        "admin_approval",
      );

      expect(result.isBackground).toBe(true);
      expect(result.triggerAfterStep).toBe("admin_approval");
      expect(result.sortOrder).toBe(0);
    });

    it("should toggle a step to foreground and clear triggerAfterStep", async () => {
      const step = createStep({
        key: "custom_step",
        isBackground: true,
        triggerAfterStep: "admin_approval",
      });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);
      mockRepo.findOrderedForeground.mockResolvedValue(createFgSteps());

      const result = await service.toggleBackground(COMPANY_ID, "custom_step", false);

      expect(result.isBackground).toBe(false);
      expect(result.triggerAfterStep).toBeNull();
    });

    it("should throw NotFoundException when step does not exist", async () => {
      mockRepo.findOneForCompanyByKey.mockResolvedValue(null);

      await expect(service.toggleBackground(COMPANY_ID, "nonexistent", true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set triggerAfterStep to null when toggling to background without trigger", async () => {
      const step = createStep({ key: "custom_step", isBackground: false });
      mockRepo.findOneForCompanyByKey.mockResolvedValue(step);

      const result = await service.toggleBackground(COMPANY_ID, "custom_step", true);

      expect(result.isBackground).toBe(true);
      expect(result.triggerAfterStep).toBeNull();
    });
  });

  describe("fgStepConfig", () => {
    it("should return the foreground step config when found", async () => {
      const step = createStep({ key: "admin_approval" });
      mockRepo.findOneForegroundForCompanyByKey.mockResolvedValue(step);

      const result = await service.fgStepConfig(COMPANY_ID, "admin_approval");

      expect(result).toEqual(step);
      expect(mockRepo.findOneForegroundForCompanyByKey).toHaveBeenCalledWith(
        COMPANY_ID,
        "admin_approval",
      );
    });

    it("should return null when step is not found", async () => {
      mockRepo.findOneForegroundForCompanyByKey.mockResolvedValue(null);

      const result = await service.fgStepConfig(COMPANY_ID, "nonexistent");

      expect(result).toBeNull();
    });
  });
});
