import * as fs from "node:fs";
import * as path from "node:path";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { LocalStorageService } from "./local-storage.service";

jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe("LocalStorageService", () => {
  let service: LocalStorageService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        UPLOAD_DIR: "./test-uploads",
        API_BASE_URL: "http://localhost:4001/api",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("constructor", () => {
    it("should create upload directory if it does not exist", async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LocalStorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      module.get<LocalStorageService>(LocalStorageService);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith("./test-uploads", { recursive: true });
    });
  });

  describe("upload", () => {
    it("should upload file to local filesystem", async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from("test content"),
        originalname: "test-document.pdf",
        mimetype: "application/pdf",
        size: 12,
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as NodeJS.ReadableStream,
      };

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.upload(mockFile, "annix-app/customers/123/documents");

      expect(result).toMatchObject({
        size: 12,
        mimeType: "application/pdf",
        originalFilename: "test-document.pdf",
      });
      expect(result.path).toMatch(/^annix-app\/customers\/123\/documents\/[a-f0-9-]+\.pdf$/);
      expect(result.url).toContain("http://localhost:4001/api/api/files/");
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });

    it("should create directory if it does not exist", async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from("test"),
        originalname: "test.txt",
        mimetype: "text/plain",
        size: 4,
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as NodeJS.ReadableStream,
      };

      (mockFs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p === "./test-uploads") return true;
        return false;
      });
      (mockFsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.upload(mockFile, "new/directory");

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it("should normalize path separators in result", async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from("test"),
        originalname: "test.txt",
        mimetype: "text/plain",
        size: 4,
        fieldname: "file",
        encoding: "7bit",
        destination: "",
        filename: "",
        path: "",
        stream: null as unknown as NodeJS.ReadableStream,
      };

      (mockFsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.upload(mockFile, "path/with/slashes");

      expect(result.path).not.toContain("\\");
    });
  });

  describe("download", () => {
    it("should download file from local filesystem", async () => {
      const fileContent = Buffer.from("file content");

      (mockFsPromises.access as jest.Mock).mockResolvedValue(undefined);
      (mockFsPromises.readFile as jest.Mock).mockResolvedValue(fileContent);

      const result = await service.download("annix-app/test/file.pdf");

      expect(result).toEqual(fileContent);
      expect(mockFsPromises.readFile).toHaveBeenCalledWith(
        path.join("./test-uploads", "annix-app/test/file.pdf"),
      );
    });

    it("should throw NotFoundException when file does not exist", async () => {
      (mockFsPromises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      await expect(service.download("nonexistent/file.pdf")).rejects.toThrow(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete file from local filesystem", async () => {
      (mockFsPromises.access as jest.Mock).mockResolvedValue(undefined);
      (mockFsPromises.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.delete("annix-app/test/file.pdf");

      expect(mockFsPromises.unlink).toHaveBeenCalledWith(
        path.join("./test-uploads", "annix-app/test/file.pdf"),
      );
    });

    it("should not throw if file does not exist", async () => {
      (mockFsPromises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      await expect(service.delete("nonexistent/file.pdf")).resolves.not.toThrow();
      expect(mockFsPromises.unlink).not.toHaveBeenCalled();
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      (mockFsPromises.access as jest.Mock).mockResolvedValue(undefined);

      const result = await service.exists("annix-app/test/file.pdf");

      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      (mockFsPromises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      const result = await service.exists("nonexistent/file.pdf");

      expect(result).toBe(false);
    });
  });

  describe("getPublicUrl", () => {
    it("should return local URL format", () => {
      const result = service.getPublicUrl("annix-app/test/file.pdf");

      expect(result).toBe("http://localhost:4001/api/api/files/annix-app/test/file.pdf");
    });

    it("should normalize backslashes", () => {
      const result = service.getPublicUrl("path\\with\\backslashes\\file.pdf");

      expect(result).toBe("http://localhost:4001/api/api/files/path/with/backslashes/file.pdf");
    });
  });

  describe("getPresignedUrl", () => {
    it("should return same as getPublicUrl for local storage", async () => {
      const publicUrl = service.getPublicUrl("test/file.pdf");
      const presignedUrl = await service.getPresignedUrl("test/file.pdf");

      expect(presignedUrl).toBe(publicUrl);
    });

    it("should ignore expiresIn parameter", async () => {
      const url1 = await service.getPresignedUrl("test/file.pdf", 3600);
      const url2 = await service.getPresignedUrl("test/file.pdf", 7200);

      expect(url1).toBe(url2);
    });
  });

  describe("getFullPath", () => {
    it("should return full filesystem path", () => {
      const result = service.getFullPath("annix-app/test/file.pdf");

      expect(result).toBe(path.join("./test-uploads", "annix-app/test/file.pdf"));
    });
  });
});
