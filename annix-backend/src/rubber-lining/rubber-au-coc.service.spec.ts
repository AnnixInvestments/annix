import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmailService } from "../email/email.service";
import { STORAGE_SERVICE } from "../storage/storage.interface";
import { AuCocReadinessStatus, AuCocStatus, RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberRollRejection } from "./entities/rubber-roll-rejection.entity";
import { RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocService } from "./rubber-au-coc.service";

describe("RubberAuCocService", () => {
  let service: RubberAuCocService;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
    update: jest.fn(),
    create: jest.fn((data: unknown) => data),
    createQueryBuilder: jest.fn(),
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
        { provide: getRepositoryToken(RubberAuCoc), useValue: auCocRepo },
        { provide: getRepositoryToken(RubberAuCocItem), useValue: auCocItemRepo },
        { provide: getRepositoryToken(RubberRollStock), useValue: rollStockRepo },
        { provide: getRepositoryToken(RubberCompoundBatch), useValue: compoundBatchRepo },
        { provide: getRepositoryToken(RubberCompany), useValue: companyRepo },
        {
          provide: getRepositoryToken(RubberCompoundQualityConfig),
          useValue: qualityConfigRepo,
        },
        { provide: getRepositoryToken(RubberSupplierCoc), useValue: supplierCocRepo },
        { provide: getRepositoryToken(RubberDeliveryNote), useValue: deliveryNoteRepo },
        { provide: getRepositoryToken(RubberDeliveryNoteItem), useValue: deliveryNoteItemRepo },
        { provide: getRepositoryToken(RubberRollRejection), useValue: rollRejectionRepo },
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
      auCocRepo.findOne.mockResolvedValue(cocFixture);
      auCocItemRepo.find.mockResolvedValue([buildItemFixture()]);

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
      auCocRepo.findOne.mockResolvedValue(cocFixture);
      auCocItemRepo.find.mockResolvedValue([buildItemFixture()]);

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
