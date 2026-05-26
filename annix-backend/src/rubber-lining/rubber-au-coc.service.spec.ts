import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../email/email.service";
import { STORAGE_SERVICE } from "../storage/storage.interface";
import { AuCocReadinessStatus, AuCocStatus, RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
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
});
