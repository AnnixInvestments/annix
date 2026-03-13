import { Readable } from "node:stream";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { LocalStorageService } from "./local-storage.service";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "./storage.interface";

jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn(),
  },
}));

describe("Storage Integration Tests", () => {
  let storageService: IStorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        UPLOAD_DIR: "./test-uploads",
        API_BASE_URL: "http://localhost:4001/api",
        STORAGE_TYPE: "local",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: STORAGE_SERVICE,
          useClass: LocalStorageService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    storageService = module.get<IStorageService>(STORAGE_SERVICE);
  });

  describe("StorageArea enum", () => {
    it("should have correct area prefixes", () => {
      expect(StorageArea.ANNIX_APP).toBe("annix-app");
      expect(StorageArea.AU_RUBBER).toBe("au-rubber");
      expect(StorageArea.ANNIX_REP).toBe("fieldflow");
      expect(StorageArea.CV_ASSISTANT).toBe("cv-assistant");
      expect(StorageArea.SECURE_DOCUMENTS).toBe("secure-documents");
      expect(StorageArea.STOCK_CONTROL).toBe("stock-control");
    });
  });

  describe("Document Upload Patterns", () => {
    const createMockFile = (name: string, type: string, content = "test"): Express.Multer.File => ({
      buffer: Buffer.from(content),
      originalname: name,
      mimetype: type,
      size: content.length,
      fieldname: "file",
      encoding: "7bit",
      destination: "",
      filename: "",
      path: "",
      stream: null as unknown as Readable,
    });

    describe("Customer Documents", () => {
      it("should upload to annix-app/customers path", async () => {
        const file = createMockFile("invoice.pdf", "application/pdf");
        const customerId = 123;
        const subPath = `${StorageArea.ANNIX_APP}/customers/${customerId}/documents`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(
          new RegExp(`^${StorageArea.ANNIX_APP}/customers/123/documents/`),
        );
        expect(result.originalFilename).toBe("invoice.pdf");
        expect(result.mimeType).toBe("application/pdf");
      });
    });

    describe("Supplier Documents", () => {
      it("should upload to annix-app/suppliers path", async () => {
        const file = createMockFile("quote.pdf", "application/pdf");
        const supplierId = 456;
        const subPath = `${StorageArea.ANNIX_APP}/suppliers/${supplierId}/documents`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(
          new RegExp(`^${StorageArea.ANNIX_APP}/suppliers/456/documents/`),
        );
      });
    });

    describe("RFQ Documents", () => {
      it("should upload to annix-app/rfq-documents path", async () => {
        const file = createMockFile("rfq-attachment.pdf", "application/pdf");
        const rfqId = 789;
        const subPath = `${StorageArea.ANNIX_APP}/rfq-documents/${rfqId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.ANNIX_APP}/rfq-documents/789/`));
      });
    });

    describe("Drawings", () => {
      it("should upload to annix-app/drawings with year/month path", async () => {
        const file = createMockFile("drawing.dwg", "application/acad");
        const year = 2025;
        const month = "03";
        const subPath = `${StorageArea.ANNIX_APP}/drawings/${year}/${month}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.ANNIX_APP}/drawings/2025/03/`));
      });
    });

    describe("FieldFlow Recordings", () => {
      it("should upload to fieldflow/recordings path", async () => {
        const file = createMockFile("meeting-recording.webm", "audio/webm");
        const meetingId = 101;
        const subPath = `${StorageArea.ANNIX_REP}/recordings/${meetingId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.ANNIX_REP}/recordings/101/`));
        expect(result.mimeType).toBe("audio/webm");
      });
    });

    describe("CV Assistant", () => {
      it("should upload to cv-assistant/candidates path", async () => {
        const file = createMockFile("resume.pdf", "application/pdf");
        const companyId = 202;
        const subPath = `${StorageArea.CV_ASSISTANT}/candidates/${companyId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.CV_ASSISTANT}/candidates/202/`));
      });
    });

    describe("AU Rubber Documents", () => {
      it("should upload CoCs to au-rubber/cocs path", async () => {
        const file = createMockFile("coc.pdf", "application/pdf");
        const companyId = 303;
        const subPath = `${StorageArea.AU_RUBBER}/cocs/${companyId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.AU_RUBBER}/cocs/303/`));
      });

      it("should upload delivery notes to au-rubber/delivery-notes path", async () => {
        const file = createMockFile("delivery-note.pdf", "application/pdf");
        const companyId = 303;
        const subPath = `${StorageArea.AU_RUBBER}/delivery-notes/${companyId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.AU_RUBBER}/delivery-notes/303/`));
      });

      it("should upload graphs to au-rubber/graphs path", async () => {
        const file = createMockFile("graph.pdf", "application/pdf");
        const companyId = 303;
        const subPath = `${StorageArea.AU_RUBBER}/graphs/${companyId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.AU_RUBBER}/graphs/303/`));
      });
    });

    describe("Stock Control Documents", () => {
      it("should upload job cards to stock-control/job-cards path", async () => {
        const file = createMockFile("job-card.pdf", "application/pdf");
        const companyId = 404;
        const jobCardId = 505;
        const subPath = `${StorageArea.STOCK_CONTROL}/job-cards/${companyId}/${jobCardId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.STOCK_CONTROL}/job-cards/404/505/`));
      });

      it("should upload signatures to stock-control/signatures path", async () => {
        const file = createMockFile("signature.png", "image/png");
        const companyId = 404;
        const subPath = `${StorageArea.STOCK_CONTROL}/signatures/${companyId}`;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.STOCK_CONTROL}/signatures/404/`));
      });
    });

    describe("Secure Documents", () => {
      it("should upload to secure-documents path", async () => {
        const file = createMockFile("encrypted.enc", "application/octet-stream");
        const subPath = StorageArea.SECURE_DOCUMENTS;

        const result = await storageService.upload(file, subPath);

        expect(result.path).toMatch(new RegExp(`^${StorageArea.SECURE_DOCUMENTS}/`));
      });
    });
  });

  describe("Document Download Patterns", () => {
    const mockFsPromises = jest.requireMock("node:fs").promises;

    it("should download file and return buffer", async () => {
      const fileContent = Buffer.from("PDF content here");
      mockFsPromises.access.mockResolvedValue(undefined);
      mockFsPromises.readFile.mockResolvedValue(fileContent);

      const result = await storageService.download(
        `${StorageArea.ANNIX_APP}/customers/123/documents/file.pdf`,
      );

      expect(result).toEqual(fileContent);
    });

    it("should throw NotFoundException for missing files", async () => {
      mockFsPromises.access.mockRejectedValue(new Error("ENOENT"));

      await expect(
        storageService.download(`${StorageArea.ANNIX_APP}/customers/123/documents/missing.pdf`),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("File Existence Check", () => {
    const mockFsPromises = jest.requireMock("node:fs").promises;

    it("should return true for existing files", async () => {
      mockFsPromises.access.mockResolvedValue(undefined);

      const result = await storageService.exists(
        `${StorageArea.ANNIX_REP}/recordings/1/audio.webm`,
      );

      expect(result).toBe(true);
    });

    it("should return false for missing files", async () => {
      mockFsPromises.access.mockRejectedValue(new Error("ENOENT"));

      const result = await storageService.exists(
        `${StorageArea.ANNIX_REP}/recordings/999/missing.webm`,
      );

      expect(result).toBe(false);
    });
  });

  describe("File Deletion", () => {
    const mockFsPromises = jest.requireMock("node:fs").promises;

    it("should delete existing file", async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await storageService.delete(`${StorageArea.CV_ASSISTANT}/candidates/123/cv.pdf`);

      expect(mockFsPromises.unlink).toHaveBeenCalled();
    });

    it("should not throw for missing file on delete", async () => {
      mockFsPromises.access.mockRejectedValue(new Error("ENOENT"));

      await expect(
        storageService.delete(`${StorageArea.CV_ASSISTANT}/candidates/123/missing.pdf`),
      ).resolves.not.toThrow();
    });
  });

  describe("Presigned URLs", () => {
    it("should generate presigned URL for file access", async () => {
      const path = `${StorageArea.ANNIX_REP}/recordings/1/audio.webm`;

      const url = await storageService.getPresignedUrl(path, 3600);

      expect(url).toContain(path.replace(/\\/g, "/"));
    });
  });

  describe("MIME Type Handling", () => {
    const createMockFile = (name: string, type: string): Express.Multer.File => ({
      buffer: Buffer.from("test"),
      originalname: name,
      mimetype: type,
      size: 4,
      fieldname: "file",
      encoding: "7bit",
      destination: "",
      filename: "",
      path: "",
      stream: null as unknown as Readable,
    });

    it("should preserve PDF mime type", async () => {
      const file = createMockFile("doc.pdf", "application/pdf");

      const result = await storageService.upload(file, `${StorageArea.ANNIX_APP}/test`);

      expect(result.mimeType).toBe("application/pdf");
    });

    it("should preserve image mime types", async () => {
      const pngFile = createMockFile("image.png", "image/png");
      const jpgFile = createMockFile("photo.jpg", "image/jpeg");

      const pngResult = await storageService.upload(pngFile, `${StorageArea.STOCK_CONTROL}/test`);
      const jpgResult = await storageService.upload(jpgFile, `${StorageArea.STOCK_CONTROL}/test`);

      expect(pngResult.mimeType).toBe("image/png");
      expect(jpgResult.mimeType).toBe("image/jpeg");
    });

    it("should preserve audio mime types for recordings", async () => {
      const webmFile = createMockFile("recording.webm", "audio/webm");
      const mp3File = createMockFile("recording.mp3", "audio/mpeg");

      const webmResult = await storageService.upload(
        webmFile,
        `${StorageArea.ANNIX_REP}/recordings/1`,
      );
      const mp3Result = await storageService.upload(
        mp3File,
        `${StorageArea.ANNIX_REP}/recordings/1`,
      );

      expect(webmResult.mimeType).toBe("audio/webm");
      expect(mp3Result.mimeType).toBe("audio/mpeg");
    });
  });

  describe("Large File Handling", () => {
    it("should handle large file uploads", async () => {
      const largeContent = "x".repeat(10 * 1024 * 1024);
      const file: Express.Multer.File = {
        buffer: Buffer.from(largeContent),
        originalname: "large-recording.webm",
        mimetype: "audio/webm",
        size: largeContent.length,
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as Readable,
      };

      const result = await storageService.upload(file, `${StorageArea.ANNIX_REP}/recordings/1`);

      expect(result.size).toBe(10 * 1024 * 1024);
    });
  });
});
