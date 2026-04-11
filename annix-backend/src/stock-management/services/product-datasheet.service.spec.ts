import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { ProductDatasheet } from "../entities/product-datasheet.entity";
import { DatasheetExtractionService } from "./datasheet-extraction.service";
import { ProductDatasheetService } from "./product-datasheet.service";
import { RubberCompoundService } from "./rubber-compound.service";

describe("ProductDatasheetService", () => {
  let service: ProductDatasheetService;

  const mockDatasheetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    publicUrl: jest.fn(),
    presignedUrl: jest.fn(),
  };

  const mockExtractionService = {
    extractFromBuffer: jest.fn(),
  };

  const mockCompoundService = {
    setDatasheetStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductDatasheetService,
        { provide: getRepositoryToken(ProductDatasheet), useValue: mockDatasheetRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorage },
        { provide: DatasheetExtractionService, useValue: mockExtractionService },
        { provide: RubberCompoundService, useValue: mockCompoundService },
      ],
    }).compile();

    service = module.get<ProductDatasheetService>(ProductDatasheetService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("upload", () => {
    it("requires exactly one owner ID", async () => {
      const fakeFile = {
        buffer: Buffer.from("pdf"),
        mimetype: "application/pdf",
      } as Express.Multer.File;
      await expect(
        service.upload(1, {
          productType: "rubber_compound",
          file: fakeFile,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when multiple owner IDs are set", async () => {
      const fakeFile = {
        buffer: Buffer.from("pdf"),
        mimetype: "application/pdf",
      } as Express.Multer.File;
      await expect(
        service.upload(1, {
          productType: "rubber_compound",
          rubberCompoundId: 1,
          paintProductId: 2,
          file: fakeFile,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
