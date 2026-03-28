import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { CpoService } from "../services/cpo.service";
import { DrawingExtractionService } from "../services/drawing-extraction.service";
import { JobCardService } from "../services/job-card.service";
import { JobCardImportService } from "../services/job-card-import.service";
import { JobCardVersionService } from "../services/job-card-version.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { JobFileService } from "../services/job-file.service";
import { RequisitionService } from "../services/requisition.service";
import { StockAllocationService } from "../services/stock-allocation.service";
import { JobCardsController } from "./job-cards.controller";

describe("JobCardsController", () => {
  let controller: JobCardsController;
  let jobCardService: jest.Mocked<JobCardService>;
  let coatingAnalysisService: jest.Mocked<CoatingAnalysisService>;
  let requisitionService: jest.Mocked<RequisitionService>;
  let versionService: jest.Mocked<JobCardVersionService>;
  let drawingExtractionService: jest.Mocked<DrawingExtractionService>;
  let workflowService: jest.Mocked<JobCardWorkflowService>;
  let cpoService: jest.Mocked<CpoService>;
  let stockItemRepo: Record<string, jest.Mock>;
  let dimensionOverrideRepo: Record<string, jest.Mock>;
  let stockMovementRepo: Record<string, jest.Mock>;

  const mockReq = (companyId = 1) => ({
    user: { id: 10, companyId, name: "Test User", email: "test@example.com", uid: "uid-123" },
  });

  beforeEach(async () => {
    const mockJobCardService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      deliveryJobCards: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      allocateStock: jest.fn(),
      allocationsByJobCard: jest.fn(),
      pendingAllocations: jest.fn(),
      approveOverAllocation: jest.fn(),
      rejectOverAllocation: jest.fn(),
      undoAllocation: jest.fn(),
      uploadAllocationPhoto: jest.fn(),
    };

    const mockCoatingAnalysisService = {
      findByJobCard: jest.fn(),
      analyseJobCard: jest.fn(),
      updateSurfaceArea: jest.fn(),
      unverifiedProducts: jest.fn(),
      verifyFromTds: jest.fn(),
      acceptRecommendation: jest.fn(),
    };

    const mockRequisitionService = {
      createFromJobCard: jest.fn(),
    };

    const mockVersionService = {
      createAmendment: jest.fn(),
      versionHistory: jest.fn(),
      versionById: jest.fn(),
    };

    const mockDrawingExtractionService = {
      attachments: jest.fn(),
      uploadAttachment: jest.fn(),
      triggerExtraction: jest.fn(),
      extractAllFromJobCard: jest.fn(),
      deleteAttachment: jest.fn(),
    };

    const mockWorkflowService = {
      initializeWorkflow: jest.fn(),
      effectiveWorkflowStatuses: jest.fn().mockResolvedValue({}),
    };

    const mockCpoService = {
      createCalloffRecords: jest.fn(),
    };

    stockItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    dimensionOverrideRepo = {
      createQueryBuilder: jest.fn(),
    };

    stockMovementRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobCardsController],
      providers: [
        { provide: JobCardService, useValue: mockJobCardService },
        { provide: CoatingAnalysisService, useValue: mockCoatingAnalysisService },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: JobCardVersionService, useValue: mockVersionService },
        { provide: DrawingExtractionService, useValue: mockDrawingExtractionService },
        { provide: JobCardWorkflowService, useValue: mockWorkflowService },
        { provide: CpoService, useValue: mockCpoService },
        {
          provide: JobCardImportService,
          useValue: { reExtractLineItems: jest.fn() },
        },
        {
          provide: JobFileService,
          useValue: {
            listFiles: jest.fn(),
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            presignedUrlForFile: jest.fn(),
          },
        },
        {
          provide: StockAllocationService,
          useValue: {
            planAllocation: jest.fn(),
            confirmAllocation: jest.fn(),
            undoAllocation: jest.fn(),
            allocationsByJobCard: jest.fn(),
          },
        },
        { provide: getRepositoryToken(StockItem), useValue: stockItemRepo },
        { provide: getRepositoryToken(RubberDimensionOverride), useValue: dimensionOverrideRepo },
        { provide: getRepositoryToken(StockMovement), useValue: stockMovementRepo },
        {
          provide: getRepositoryToken(JobCardLineItem),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() },
        },
        {
          provide: "STORAGE_SERVICE",
          useValue: { upload: jest.fn(), download: jest.fn(), presignedUrl: jest.fn() },
        },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JobCardsController>(JobCardsController);
    jobCardService = module.get(JobCardService);
    coatingAnalysisService = module.get(CoatingAnalysisService);
    requisitionService = module.get(RequisitionService);
    versionService = module.get(JobCardVersionService);
    drawingExtractionService = module.get(DrawingExtractionService);
    workflowService = module.get(JobCardWorkflowService);
    cpoService = module.get(CpoService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET / (list)", () => {
    it("should parse pagination and delegate to jobCardService.findAll", async () => {
      jobCardService.findAll.mockResolvedValue([] as any);

      const result = await controller.list(mockReq(), "active", "2", "25");

      expect(jobCardService.findAll).toHaveBeenCalledWith(1, "active", 2, 25);
      expect(result).toEqual([]);
    });

    it("should default to page 1 and limit 50", async () => {
      jobCardService.findAll.mockResolvedValue([] as any);

      await controller.list(mockReq());

      expect(jobCardService.findAll).toHaveBeenCalledWith(1, undefined, 1, 50);
    });

    it("should clamp page to minimum 1 and limit to max 100", async () => {
      jobCardService.findAll.mockResolvedValue([] as any);

      await controller.list(mockReq(), undefined, "0", "200");

      expect(jobCardService.findAll).toHaveBeenCalledWith(1, undefined, 1, 100);
    });
  });

  describe("GET /:id (findById)", () => {
    it("should delegate to jobCardService.findById", async () => {
      const jobCard = { id: 5, title: "JC-001" };
      jobCardService.findById.mockResolvedValue(jobCard as any);

      const result = await controller.findById(mockReq(), 5);

      expect(jobCardService.findById).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(jobCard);
    });
  });

  describe("GET /:id/delivery-job-cards", () => {
    it("should delegate to jobCardService.deliveryJobCards", async () => {
      const djcs = [{ id: 10 }];
      jobCardService.deliveryJobCards.mockResolvedValue(djcs as any);

      const result = await controller.deliveryJobCards(mockReq(), 5);

      expect(jobCardService.deliveryJobCards).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(djcs);
    });
  });

  describe("POST / (create)", () => {
    it("should delegate to jobCardService.create", async () => {
      const dto = { title: "New JC" } as any;
      const created = { id: 1, title: "New JC" };
      jobCardService.create.mockResolvedValue(created as any);

      const result = await controller.create(dto, mockReq());

      expect(jobCardService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(created);
    });
  });

  describe("PUT /:id (update)", () => {
    it("should delegate to jobCardService.update for non-active status", async () => {
      const dto = { title: "Updated" } as any;
      const updated = { id: 5, title: "Updated" };
      jobCardService.update.mockResolvedValue(updated as any);

      const result = await controller.update(mockReq(), 5, dto);

      expect(jobCardService.update).toHaveBeenCalledWith(1, 5, dto);
      expect(result).toBe(updated);
    });

    it("should throw BadRequestException when activating with unverified coatings", async () => {
      const dto = { status: "active" } as any;
      coatingAnalysisService.unverifiedProducts.mockResolvedValue([
        { product: "Product A" },
      ] as any);

      await expect(controller.update(mockReq(), 5, dto)).rejects.toThrow(BadRequestException);
      expect(coatingAnalysisService.unverifiedProducts).toHaveBeenCalledWith(1, 5);
    });

    it("should initialize workflow, requisition, and CPO on activation", async () => {
      const dto = { status: "active" } as any;
      coatingAnalysisService.unverifiedProducts.mockResolvedValue([]);
      jobCardService.update.mockResolvedValue({ id: 5 } as any);
      workflowService.initializeWorkflow.mockResolvedValue(undefined as any);
      requisitionService.createFromJobCard.mockResolvedValue(undefined as any);
      cpoService.createCalloffRecords.mockResolvedValue(undefined as any);

      const result = await controller.update(mockReq(), 5, dto);

      expect(workflowService.initializeWorkflow).toHaveBeenCalledWith(
        1,
        5,
        {
          id: 10,
          name: "Test User",
        },
        { advance: true },
      );
      expect(requisitionService.createFromJobCard).toHaveBeenCalledWith(1, 5, "Test User");
      expect(cpoService.createCalloffRecords).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual({ id: 5 });
    });

    it("should include warnings when activation side-effects fail", async () => {
      const dto = { status: "active" } as any;
      coatingAnalysisService.unverifiedProducts.mockResolvedValue([]);
      jobCardService.update.mockResolvedValue({ id: 5 } as any);
      workflowService.initializeWorkflow.mockRejectedValue(new Error("Workflow error"));
      requisitionService.createFromJobCard.mockRejectedValue(new Error("Requisition error"));
      cpoService.createCalloffRecords.mockRejectedValue(new Error("CPO error"));

      const result = await controller.update(mockReq(), 5, dto);

      expect(result).toEqual({
        id: 5,
        warnings: [
          "Workflow initialization failed: Workflow error",
          "Requisition creation failed: Requisition error",
          "CPO calloff creation failed: CPO error",
        ],
      });
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delegate to jobCardService.remove", async () => {
      jobCardService.remove.mockResolvedValue(undefined as any);

      await controller.remove(mockReq(), 5);

      expect(jobCardService.remove).toHaveBeenCalledWith(1, 5);
    });
  });

  describe("GET /:id/coating-analysis", () => {
    it("should delegate to coatingAnalysisService.findByJobCard", async () => {
      const analysis = { id: 1 };
      coatingAnalysisService.findByJobCard.mockResolvedValue(analysis as any);

      const result = await controller.coatingAnalysis(mockReq(), 5);

      expect(coatingAnalysisService.findByJobCard).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(analysis);
    });
  });

  describe("POST /:id/coating-analysis", () => {
    it("should delegate to coatingAnalysisService.analyseJobCard", async () => {
      const analysis = { id: 1 };
      coatingAnalysisService.analyseJobCard.mockResolvedValue(analysis as any);

      const result = await controller.triggerCoatingAnalysis(mockReq(), 5);

      expect(coatingAnalysisService.analyseJobCard).toHaveBeenCalledWith(5, 1);
      expect(result).toBe(analysis);
    });
  });

  describe("PUT /:id/coating-analysis/surface-area", () => {
    it("should delegate to coatingAnalysisService.updateSurfaceArea", async () => {
      const expected = { updated: true };
      coatingAnalysisService.updateSurfaceArea.mockResolvedValue(expected as any);

      const result = await controller.updateSurfaceArea(mockReq(), 5, { extM2: 10, intM2: 8 });

      expect(coatingAnalysisService.updateSurfaceArea).toHaveBeenCalledWith(1, 5, 10, 8);
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/coating-analysis/unverified", () => {
    it("should delegate to coatingAnalysisService.unverifiedProducts", async () => {
      const unverified = [{ product: "Product A" }];
      coatingAnalysisService.unverifiedProducts.mockResolvedValue(unverified as any);

      const result = await controller.unverifiedCoatingProducts(mockReq(), 5);

      expect(coatingAnalysisService.unverifiedProducts).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(unverified);
    });
  });

  describe("POST /:id/coating-analysis/verify-tds", () => {
    it("should delegate file buffer to coatingAnalysisService.verifyFromTds", async () => {
      const file = { buffer: Buffer.from("tds-pdf") } as Express.Multer.File;
      const expected = { verified: true };
      coatingAnalysisService.verifyFromTds.mockResolvedValue(expected as any);

      const result = await controller.verifyCoatingTds(mockReq(), 5, file);

      expect(coatingAnalysisService.verifyFromTds).toHaveBeenCalledWith(1, 5, file);
      expect(result).toBe(expected);
    });
  });

  describe("PATCH /:id/coating-analysis/accept", () => {
    it("should delegate to coatingAnalysisService.acceptRecommendation", async () => {
      const expected = { accepted: true };
      coatingAnalysisService.acceptRecommendation.mockResolvedValue(expected as any);

      const result = await controller.acceptCoatingAnalysis(mockReq(), 5);

      expect(coatingAnalysisService.acceptRecommendation).toHaveBeenCalledWith(1, 5, "Test User");
      expect(result).toBe(expected);
    });

    it("should fall back to email then uid when name is missing", async () => {
      coatingAnalysisService.acceptRecommendation.mockResolvedValue({} as any);
      const req = {
        user: { id: 10, companyId: 1, name: null, email: "test@example.com", uid: "uid-123" },
      };

      await controller.acceptCoatingAnalysis(req, 5);

      expect(coatingAnalysisService.acceptRecommendation).toHaveBeenCalledWith(
        1,
        5,
        "test@example.com",
      );
    });
  });

  describe("POST /:id/allocate (allocateStock)", () => {
    it("should merge dto with jobCardId and allocatedBy then delegate", async () => {
      const dto = { stockItemId: 1, quantity: 5 } as any;
      const expected = { id: 1 };
      jobCardService.allocateStock.mockResolvedValue(expected as any);

      const result = await controller.allocateStock(5, dto, mockReq());

      expect(jobCardService.allocateStock).toHaveBeenCalledWith(1, {
        stockItemId: 1,
        quantity: 5,
        jobCardId: 5,
        allocatedBy: "Test User",
      });
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/allocations", () => {
    it("should delegate to jobCardService.allocationsByJobCard", async () => {
      const allocations = [{ id: 1 }];
      jobCardService.allocationsByJobCard.mockResolvedValue(allocations as any);

      const result = await controller.allocations(mockReq(), 5);

      expect(jobCardService.allocationsByJobCard).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(allocations);
    });
  });

  describe("GET /allocations/pending", () => {
    it("should delegate to jobCardService.pendingAllocations", async () => {
      const pending = [{ id: 1 }];
      jobCardService.pendingAllocations.mockResolvedValue(pending as any);

      const result = await controller.pendingAllocations(mockReq());

      expect(jobCardService.pendingAllocations).toHaveBeenCalledWith(1);
      expect(result).toBe(pending);
    });
  });

  describe("POST /:id/allocations/:allocationId/approve", () => {
    it("should delegate to jobCardService.approveOverAllocation", async () => {
      const expected = { approved: true };
      jobCardService.approveOverAllocation.mockResolvedValue(expected as any);

      const result = await controller.approveOverAllocation(mockReq(), 20);

      expect(jobCardService.approveOverAllocation).toHaveBeenCalledWith(1, 20, 10);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/allocations/:allocationId/reject", () => {
    it("should delegate to jobCardService.rejectOverAllocation with reason", async () => {
      const dto = { reason: "Too much" } as any;
      const expected = { rejected: true };
      jobCardService.rejectOverAllocation.mockResolvedValue(expected as any);

      const result = await controller.rejectOverAllocation(mockReq(), 20, dto);

      expect(jobCardService.rejectOverAllocation).toHaveBeenCalledWith(1, 20, "Too much");
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/allocations/:allocationId/undo", () => {
    it("should delegate to jobCardService.undoAllocation", async () => {
      const expected = { undone: true };
      jobCardService.undoAllocation.mockResolvedValue(expected as any);

      const result = await controller.undoAllocation(mockReq(), 5, 20);

      expect(jobCardService.undoAllocation).toHaveBeenCalledWith(1, 20, {
        id: 10,
        name: "Test User",
      });
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/allocations/:allocationId/photo", () => {
    it("should delegate to jobCardService.uploadAllocationPhoto", async () => {
      const file = { buffer: Buffer.from("photo") } as Express.Multer.File;
      const expected = { photoUrl: "https://example.com" };
      jobCardService.uploadAllocationPhoto.mockResolvedValue(expected as any);

      const result = await controller.uploadAllocationPhoto(mockReq(), 20, file);

      expect(jobCardService.uploadAllocationPhoto).toHaveBeenCalledWith(1, 20, file);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/amendment", () => {
    it("should delegate to versionService.createAmendment", async () => {
      const file = { buffer: Buffer.from("amendment") } as Express.Multer.File;
      const dto = { notes: "Rev 2 changes" } as any;
      const expected = { id: 1 };
      versionService.createAmendment.mockResolvedValue(expected as any);

      const result = await controller.uploadAmendment(mockReq(), 5, file, dto);

      expect(versionService.createAmendment).toHaveBeenCalledWith(
        1,
        5,
        file,
        "Rev 2 changes",
        "Test User",
      );
      expect(result).toBe(expected);
    });

    it("should pass null notes when not provided", async () => {
      const file = { buffer: Buffer.from("amendment") } as Express.Multer.File;
      const dto = {} as any;
      versionService.createAmendment.mockResolvedValue({} as any);

      await controller.uploadAmendment(mockReq(), 5, file, dto);

      expect(versionService.createAmendment).toHaveBeenCalledWith(1, 5, file, null, "Test User");
    });
  });

  describe("GET /:id/versions", () => {
    it("should delegate to versionService.versionHistory", async () => {
      const history = [{ id: 1, version: 1 }];
      versionService.versionHistory.mockResolvedValue(history as any);

      const result = await controller.versionHistory(mockReq(), 5);

      expect(versionService.versionHistory).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(history);
    });
  });

  describe("GET /:id/versions/:versionId", () => {
    it("should delegate to versionService.versionById", async () => {
      const version = { id: 3, version: 2 };
      versionService.versionById.mockResolvedValue(version as any);

      const result = await controller.versionById(mockReq(), 5, 3);

      expect(versionService.versionById).toHaveBeenCalledWith(1, 5, 3);
      expect(result).toBe(version);
    });
  });

  describe("GET /:id/attachments", () => {
    it("should delegate to drawingExtractionService.attachments", async () => {
      const attachments = [{ id: 1, filename: "drawing.pdf" }];
      drawingExtractionService.attachments.mockResolvedValue(attachments as any);

      const result = await controller.attachments(mockReq(), 5);

      expect(drawingExtractionService.attachments).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(attachments);
    });
  });

  describe("POST /:id/attachments", () => {
    it("should delegate to drawingExtractionService.uploadAttachment", async () => {
      const file = { buffer: Buffer.from("drawing") } as Express.Multer.File;
      const dto = { notes: "Main drawing" } as any;
      const expected = { id: 1 };
      drawingExtractionService.uploadAttachment.mockResolvedValue(expected as any);

      const result = await controller.uploadAttachment(mockReq(), 5, file, dto);

      expect(drawingExtractionService.uploadAttachment).toHaveBeenCalledWith(
        1,
        5,
        file,
        "Test User",
        "Main drawing",
      );
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/attachments/:attachmentId/extract", () => {
    it("should delegate to drawingExtractionService.triggerExtraction", async () => {
      const expected = { status: "processing" };
      drawingExtractionService.triggerExtraction.mockResolvedValue(expected as any);

      const result = await controller.triggerExtraction(mockReq(), 5, 10);

      expect(drawingExtractionService.triggerExtraction).toHaveBeenCalledWith(1, 5, 10);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/extract-all", () => {
    it("should delegate to drawingExtractionService.extractAllFromJobCard", async () => {
      const expected = { extracted: 3 };
      drawingExtractionService.extractAllFromJobCard.mockResolvedValue(expected as any);

      const result = await controller.extractAll(mockReq(), 5);

      expect(drawingExtractionService.extractAllFromJobCard).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(expected);
    });
  });

  describe("DELETE /:id/attachments/:attachmentId", () => {
    it("should delegate to drawingExtractionService.deleteAttachment and return message", async () => {
      drawingExtractionService.deleteAttachment.mockResolvedValue(undefined as any);

      const result = await controller.deleteAttachment(mockReq(), 5, 10);

      expect(drawingExtractionService.deleteAttachment).toHaveBeenCalledWith(1, 5, 10);
      expect(result).toEqual({ message: "Attachment deleted" });
    });
  });

  describe("GET /rubber-dimension-suggestions", () => {
    it("should query dimension overrides with filters", async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      };
      dimensionOverrideRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await controller.rubberDimensionSuggestions(mockReq(), {
        itemType: "straight",
        nbMm: "100",
        schedule: "40",
        pipeLengthMm: "3000",
        flangeConfig: "FF",
      });

      expect(dimensionOverrideRepo.createQueryBuilder).toHaveBeenCalledWith("o");
      expect(mockQb.getMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("POST /:id/rubber-wastage (markOffcutAsWastage)", () => {
    it("should calculate weight, create/update wastage stock item, and record movement", async () => {
      const dto = {
        thicknessMm: 10,
        widthMm: 200,
        lengthMm: 300,
        specificGravity: 1.2,
        color: "Black",
      };

      const wastageItem = { id: 50, quantity: 5 };
      stockItemRepo.findOne.mockResolvedValue(wastageItem);
      stockItemRepo.update.mockResolvedValue(undefined);
      const movementEntity = { id: 1 };
      stockMovementRepo.create.mockReturnValue(movementEntity);
      stockMovementRepo.save.mockResolvedValue(movementEntity);

      const result = await controller.markOffcutAsWastage(mockReq(), 5, dto as any);

      expect(stockItemRepo.findOne).toHaveBeenCalled();
      expect(stockItemRepo.update).toHaveBeenCalled();
      expect(stockMovementRepo.create).toHaveBeenCalled();
      expect(stockMovementRepo.save).toHaveBeenCalled();
      expect(result.weightKg).toBeCloseTo(0.72);
      expect(result.stockItemId).toBe(50);
    });

    it("should create new wastage stock item when none exists", async () => {
      const dto = {
        thicknessMm: 10,
        widthMm: 200,
        lengthMm: 300,
        specificGravity: 1,
        color: "Red",
      };

      stockItemRepo.findOne.mockResolvedValue(null);
      const newItem = { id: 60, quantity: 0 };
      stockItemRepo.create.mockReturnValue(newItem);
      stockItemRepo.save.mockResolvedValue(newItem);
      stockItemRepo.update.mockResolvedValue(undefined);
      stockMovementRepo.create.mockReturnValue({ id: 1 });
      stockMovementRepo.save.mockResolvedValue({ id: 1 });

      const result = await controller.markOffcutAsWastage(mockReq(), 5, dto as any);

      expect(stockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          sku: "RW-RED",
          category: "rubber-wastage",
        }),
      );
      expect(result.stockItemId).toBe(60);
    });
  });
});
