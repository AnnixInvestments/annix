import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CompanyBrandingService } from "../company-branding/company-branding.service";
import { EmailService } from "../email/email.service";
import { STORAGE_SERVICE } from "../storage/storage.interface";
import { AuCocReadinessStatus, AuCocStatus, RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { RubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository";
import { RubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository";
import { RubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { RubberAuCocService } from "./rubber-au-coc.service";

describe("RubberAuCocService", () => {
  let service: RubberAuCocService;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    count: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
    saveMany: jest.fn((entities) => Promise.resolve(entities)),
    update: jest.fn(),
    updateById: jest.fn(),
    create: jest.fn((data: unknown) => data),
    build: jest.fn((data: unknown) => data),
    createQueryBuilder: jest.fn(),
    deleteById: jest.fn(),
    findWithItemCounts: jest.fn(),
    findByStatusesOrderedById: jest.fn(),
    findByStatusWithCustomerOrderedByCocNumber: jest.fn(),
    findByStatus: jest.fn(),
    findRefsByDeliveryNoteIds: jest.fn(),
    nextCocSequence: jest.fn(),
    findByAuCocIdWithRolls: jest.fn(),
    deleteByAuCocId: jest.fn(),
    findByDeliveryNoteId: jest.fn(),
    findSiblingLinkedDeliveryNote: jest.fn(),
    findManyByIdsWithCoding: jest.fn(),
    setAuCocIdForRollIds: jest.fn(),
    clearAuCocId: jest.fn(),
    findByIds: jest.fn(),
    findByIdsWithSupplierCocOrdered: jest.fn(() => Promise.resolve([])),
    countBySupplierCocId: jest.fn(() => Promise.resolve(0)),
    findBySupplierCocIdOrdered: jest.fn(() => Promise.resolve([])),
    findCompoundersByCompoundCodes: jest.fn(() => Promise.resolve([])),
    findByCocType: jest.fn(() => Promise.resolve([])),
    findByCocTypeWithCompany: jest.fn(() => Promise.resolve([])),
    findOneByCompoundCode: jest.fn(),
    findReplacementRefsByCocIds: jest.fn(() => Promise.resolve([])),
    findOneByCocTypeAndOrderNumberLatest: jest.fn(),
    findWithOrderNumberOrderedByIdDesc: jest.fn(() => Promise.resolve([])),
    findUpstreamCocsByCdnRollTrace: jest.fn(() => Promise.resolve([])),
    findActiveWithCocNumberOrderedByIdDesc: jest.fn(() => Promise.resolve([])),
  });

  const auCocRepo = mockRepo();
  const auCocItemRepo = mockRepo();
  const rollStockRepo = mockRepo();
  const compoundBatchRepo = mockRepo();
  const companyRepo = mockRepo();
  const qualityConfigRepo = mockRepo();
  const supplierCocRepo = mockRepo();
  const deliveryNoteRepo = mockRepo();
  const deliveryNoteItemRepo = mockRepo();
  const rollRejectionRepo = mockRepo();
  const storageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    publicUrl: jest.fn(),
    presignedUrl: jest.fn(),
  };
  const configService = { get: jest.fn() };
  const emailService = { sendEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberAuCocService,
        { provide: RubberAuCocRepository, useValue: auCocRepo },
        { provide: RubberAuCocItemRepository, useValue: auCocItemRepo },
        { provide: RubberRollStockRepository, useValue: rollStockRepo },
        { provide: RubberCompoundBatchRepository, useValue: compoundBatchRepo },
        { provide: RubberCompanyRepository, useValue: companyRepo },
        {
          provide: RubberCompoundQualityConfigRepository,
          useValue: qualityConfigRepo,
        },
        { provide: RubberSupplierCocRepository, useValue: supplierCocRepo },
        { provide: RubberDeliveryNoteRepository, useValue: deliveryNoteRepo },
        { provide: RubberDeliveryNoteItemRepository, useValue: deliveryNoteItemRepo },
        { provide: RubberRollRejectionRepository, useValue: rollRejectionRepo },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
        {
          provide: CompanyBrandingService,
          useValue: { letterheadImage: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<RubberAuCocService>(RubberAuCocService);
    jest.clearAllMocks();
  });

  describe("generatePdf — issue #249 transactional consistency", () => {
    const buildCocFixture = (): RubberAuCoc =>
      ({
        id: 42,
        cocNumber: "AU-COC-0042",
        status: AuCocStatus.DRAFT,
        readinessStatus: AuCocReadinessStatus.READY_FOR_GENERATION,
        readinessDetails: null,
        generatedPdfPath: null,
        extractedRollData: null,
        sourceDeliveryNoteId: null,
        customerCompany: { id: 7, name: "Example Customer", contactEmail: null },
      }) as unknown as RubberAuCoc;

    const buildItemFixture = (): RubberAuCocItem =>
      ({
        id: 100,
        auCocId: 42,
        rollNumber: "1",
        rollStockId: null,
        rollStock: null,
      }) as unknown as RubberAuCocItem;

    it("does NOT save generatedPdfPath when storage upload throws (orphan path that produced #249)", async () => {
      const cocFixture = buildCocFixture();
      auCocRepo.findById.mockResolvedValue(cocFixture);
      auCocItemRepo.findByAuCocIdWithRolls.mockResolvedValue([buildItemFixture()]);

      const fakePreparedData = { batches: [], graphPdfPath: null };
      jest.spyOn<any, any>(service, "preparePdfData").mockResolvedValue(fakePreparedData);
      jest.spyOn<any, any>(service, "createPdf").mockResolvedValue(Buffer.from("fake pdf bytes"));

      const uploadError = new Error("S3 upload failed: NoSuchBucket");
      storageService.upload.mockRejectedValue(uploadError);

      await expect(service.generatePdf(42)).rejects.toThrow("S3 upload failed: NoSuchBucket");

      expect(storageService.upload).toHaveBeenCalledTimes(1);
      const savedRows = auCocRepo.save.mock.calls.map((call) => call[0] as RubberAuCoc);
      const sawPathSave = savedRows.some(
        (row) => row && row.generatedPdfPath !== null && row.generatedPdfPath !== undefined,
      );
      expect(sawPathSave).toBe(false);
    });

    it("saves the storage upload's actual path on success — never assumes au-cocs/{filename} without confirming", async () => {
      const cocFixture = buildCocFixture();
      auCocRepo.findById.mockResolvedValue(cocFixture);
      auCocItemRepo.findByAuCocIdWithRolls.mockResolvedValue([buildItemFixture()]);

      const fakePreparedData = { batches: [], graphPdfPath: null };
      jest.spyOn<any, any>(service, "preparePdfData").mockResolvedValue(fakePreparedData);
      jest.spyOn<any, any>(service, "createPdf").mockResolvedValue(Buffer.from("real pdf"));

      storageService.upload.mockResolvedValue({
        path: "au-cocs/AU-COC-0042.pdf",
        url: "https://example-bucket.s3/au-cocs/AU-COC-0042.pdf",
        size: 8,
        mimeType: "application/pdf",
        originalFilename: "AU-COC-0042.pdf",
      });

      const result = await service.generatePdf(42);

      expect(result.filename).toBe("AU-COC-0042.pdf");
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: "AU-COC-0042.pdf",
          mimetype: "application/pdf",
        }),
        "au-cocs",
      );
      const savedRow = auCocRepo.save.mock.calls.at(-1)?.[0] as RubberAuCoc;
      expect(savedRow.generatedPdfPath).toBe("au-cocs/AU-COC-0042.pdf");
      expect(savedRow.status).toBe(AuCocStatus.GENERATED);
    });
  });

  describe("populateRollDataFromDeliveryNote — reads roll data from line items (regression: stranded AU CoCs)", () => {
    const populate = (coc: RubberAuCoc): Promise<void> =>
      (
        service as never as {
          populateRollDataFromDeliveryNote(c: RubberAuCoc): Promise<void>;
        }
      ).populateRollDataFromDeliveryNote(coc);

    const coc = (): RubberAuCoc =>
      ({
        id: 7,
        cocNumber: "AU-COC-0007",
        sourceDeliveryNoteId: 50,
        extractedRollData: null,
      }) as unknown as RubberAuCoc;

    it("populates extractedRollData from rubber_delivery_note_items when present", async () => {
      deliveryNoteRepo.findById.mockResolvedValue({
        id: 50,
        deliveryNoteNumber: "1346",
        extractedData: { rolls: [] },
      });
      deliveryNoteItemRepo.findManyWhere.mockResolvedValue([
        { rollNumber: "43299", thicknessMm: 6, widthMm: 1100, lengthM: 12.5, weightKg: 82.62 },
        { rollNumber: " ", weightKg: 10 },
      ]);

      const c = coc();
      await populate(c);

      const saved = auCocRepo.updateById.mock.calls.at(-1)?.[1] as {
        extractedRollData: Array<{ rollNumber: string }>;
      };
      expect(saved.extractedRollData).toHaveLength(1);
      expect(saved.extractedRollData[0]).toEqual(
        expect.objectContaining({
          rollNumber: "43299",
          thicknessMm: 6,
          widthMm: 1100,
          lengthM: 12.5,
          weightKg: 82.62,
        }),
      );
    });

    it("falls back to legacy extractedData.rolls when there are no line items", async () => {
      deliveryNoteRepo.findById.mockResolvedValue({
        id: 50,
        deliveryNoteNumber: "1346",
        extractedData: { rolls: [{ rollNumber: "9001", thicknessMm: 4 }] },
      });
      deliveryNoteItemRepo.findManyWhere.mockResolvedValue([]);

      await populate(coc());

      const saved = auCocRepo.updateById.mock.calls.at(-1)?.[1] as {
        extractedRollData: Array<{ rollNumber: string }>;
      };
      expect(saved.extractedRollData).toEqual([
        expect.objectContaining({ rollNumber: "9001", thicknessMm: 4 }),
      ]);
    });

    it("does not write when neither line items nor legacy rolls have data", async () => {
      deliveryNoteRepo.findById.mockResolvedValue({
        id: 50,
        deliveryNoteNumber: "1346",
        extractedData: { rolls: [] },
      });
      deliveryNoteItemRepo.findManyWhere.mockResolvedValue([]);

      await populate(coc());

      expect(auCocRepo.updateById).not.toHaveBeenCalled();
    });
  });

  describe("generationReadiness — recovers from stale direct supplier CoC links", () => {
    it("uses a roll-number matched CoC when the delivery note is linked to an incompatible CoC", async () => {
      const badLinkedCoc = {
        id: 259,
        cocType: SupplierCocType.CALENDARER,
        cocNumber: "177-40648",
        orderNumber: "177",
        compoundCode: "RSCA40",
        extractedData: {
          batches: [{ batchNumber: "228", shoreA: 40 }],
          rollNumbers: ["40648"],
        },
      };
      const correctRollMatchedCoc = {
        id: 255,
        cocType: SupplierCocType.CALENDARER,
        cocNumber: "213-42934-42941",
        orderNumber: "213",
        compoundCode: "BSCA38",
        extractedData: {
          batches: [{ batchNumber: "19", shoreA: 38 }],
          rollNumbers: ["42934", "42935", "42936", "42937", "42938", "42939", "42940", "42941"],
          linkedCompounderCocIds: [206, 169],
        },
      };
      const incompatibleCompounder = {
        id: 206,
        cocType: SupplierCocType.COMPOUNDER,
        cocNumber: "B17-28",
        compoundCode: "AUC50BBSC",
      };
      const compatibleCompounder = {
        id: 169,
        cocType: SupplierCocType.COMPOUNDER,
        cocNumber: "B19-36",
        compoundCode: "AUA38BSC",
      };

      auCocRepo.findById.mockResolvedValue({
        id: 84,
        cocNumber: "AU-COC-0059",
        sourceDeliveryNoteId: 312,
        poNumber: "PL8043/PO6897",
        extractedRollData: [
          { rollNumber: "42938", thicknessMm: 6, widthMm: 800, lengthM: 12.5 },
          { rollNumber: "42939", thicknessMm: 6, widthMm: 800, lengthM: 12.5 },
        ],
      });
      auCocItemRepo.findByAuCocIdWithRolls.mockResolvedValue([]);
      deliveryNoteRepo.findById.mockResolvedValue({
        id: 312,
        supplierCompanyId: 4,
        customerReference: "PL8043/PO6897",
        linkedCoc: badLinkedCoc,
      });
      deliveryNoteRepo.findSiblingLinkedDeliveryNote.mockResolvedValue(null);
      deliveryNoteItemRepo.findManyWhere.mockResolvedValue([
        {
          deliveryNoteId: 312,
          rollNumber: "42938",
          compoundType: "BSCA38",
          thicknessMm: 6,
          widthMm: 800,
          lengthM: 12.5,
        },
        {
          deliveryNoteId: 312,
          rollNumber: "42939",
          compoundType: "BSCA38",
          thicknessMm: 6,
          widthMm: 800,
          lengthM: 12.5,
        },
      ]);
      supplierCocRepo.findActiveWithCocNumberOrderedByIdDesc.mockResolvedValue([
        badLinkedCoc,
        correctRollMatchedCoc,
      ] as never);
      supplierCocRepo.findByIds.mockResolvedValue([]);
      supplierCocRepo.findById.mockImplementation((id: number) =>
        Promise.resolve(
          id === 206 ? incompatibleCompounder : id === 169 ? compatibleCompounder : null,
        ),
      );
      supplierCocRepo.findOneByCocTypeAndOrderNumberLatest.mockResolvedValue(null);
      (compoundBatchRepo.countBySupplierCocId as jest.Mock).mockImplementation((id: number) =>
        Promise.resolve(id === 255 || id === 169 ? 1 : 0),
      );
      (compoundBatchRepo.findBySupplierCocIdOrdered as jest.Mock).mockImplementation((id: number) =>
        Promise.resolve(
          id === 169 ? [{ batchNumber: "19", shoreAHardness: 38, specificGravity: 1.04 }] : [],
        ),
      );

      const result = await service.generationReadiness(84);

      expect(result.ready).toBe(true);
      expect(result.sourceIncomplete).toBe(false);
      expect(result.resolvedSupplierCocId).toBe(255);
      expect(result.resolvedCompounderCocId).toBe(169);
      expect(result.compoundCode).toBe("BSCA38");
      expect(result.batchCount).toBe(1);
    });
  });
});
