import { Readable } from "node:stream";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { S3StorageService } from "./s3-storage.service";

const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  HeadBucketCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: "HeadBucket" })),
  CreateBucketCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, _type: "CreateBucket" })),
  PutBucketCorsCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, _type: "PutBucketCors" })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: "PutObject" })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: "GetObject" })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, _type: "DeleteObject" })),
  HeadObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: "HeadObject" })),
  BucketLocationConstraint: {},
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

describe("S3StorageService", () => {
  let service: S3StorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number> = {
        AWS_REGION: "af-south-1",
        AWS_S3_BUCKET: "test-bucket",
        AWS_ACCESS_KEY_ID: "test-key",
        AWS_SECRET_ACCESS_KEY: "test-secret",
        AWS_S3_URL_EXPIRATION: 3600,
        STORAGE_TYPE: "s3",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("upload", () => {
    it("should upload file to S3 with correct key and return result", async () => {
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
        stream: null as unknown as Readable,
      };

      mockS3Send.mockResolvedValueOnce({});
      mockGetSignedUrl.mockResolvedValueOnce("https://s3.example.com/presigned-url");

      const result = await service.upload(mockFile, "annix-app/customers/123/documents");

      expect(result).toMatchObject({
        size: 12,
        mimeType: "application/pdf",
        originalFilename: "test-document.pdf",
      });
      expect(result.path).toMatch(/^annix-app\/customers\/123\/documents\/[a-f0-9-]+\.pdf$/);
      expect(result.url).toBe("https://s3.example.com/presigned-url");

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Body: mockFile.buffer,
          ContentType: "application/pdf",
        }),
      );
    });

    it("should normalize path separators", async () => {
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
        stream: null as unknown as Readable,
      };

      mockS3Send.mockResolvedValueOnce({});
      mockGetSignedUrl.mockResolvedValueOnce("https://s3.example.com/url");

      const result = await service.upload(mockFile, "path\\with\\backslashes");

      expect(result.path).not.toContain("\\");
      expect(result.path).toContain("/");
    });

    it("should throw error on S3 upload failure", async () => {
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
        stream: null as unknown as Readable,
      };

      mockS3Send.mockRejectedValueOnce(new Error("S3 upload failed"));

      await expect(service.upload(mockFile, "test/path")).rejects.toThrow("S3 upload failed");
    });
  });

  describe("download", () => {
    it("should download file from S3", async () => {
      const fileContent = Buffer.from("file content");
      const mockStream = (async function* () {
        yield fileContent;
      })();

      mockS3Send.mockResolvedValueOnce({
        Body: mockStream,
      });

      const result = await service.download("annix-app/test/file.pdf");

      expect(result).toEqual(fileContent);
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "annix-app/test/file.pdf",
        }),
      );
    });

    it("should throw NotFoundException when file does not exist", async () => {
      const notFoundError = new Error("NoSuchKey") as Error & {
        name: string;
        $metadata: { httpStatusCode: number };
      };
      notFoundError.name = "NoSuchKey";
      notFoundError.$metadata = { httpStatusCode: 404 };

      mockS3Send.mockRejectedValueOnce(notFoundError);

      await expect(service.download("nonexistent/file.pdf")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when Body is empty", async () => {
      mockS3Send.mockResolvedValueOnce({
        Body: null,
      });

      await expect(service.download("test/file.pdf")).rejects.toThrow(NotFoundException);
    });

    it("should normalize backslashes in path", async () => {
      const fileContent = Buffer.from("content");
      const mockStream = (async function* () {
        yield fileContent;
      })();

      mockS3Send.mockResolvedValueOnce({
        Body: mockStream,
      });

      await service.download("path\\with\\backslashes\\file.pdf");

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: "path/with/backslashes/file.pdf",
        }),
      );
    });
  });

  describe("delete", () => {
    it("should delete file from S3", async () => {
      mockS3Send.mockResolvedValueOnce({});

      await service.delete("annix-app/test/file.pdf");

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "annix-app/test/file.pdf",
        }),
      );
    });

    it("should throw error on S3 delete failure", async () => {
      mockS3Send.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(service.delete("test/file.pdf")).rejects.toThrow("Delete failed");
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      mockS3Send.mockResolvedValueOnce({});

      const result = await service.exists("annix-app/test/file.pdf");

      expect(result).toBe(true);
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "annix-app/test/file.pdf",
        }),
      );
    });

    it("should return false when file does not exist", async () => {
      const notFoundError = new Error("NotFound") as Error & {
        name: string;
        $metadata: { httpStatusCode: number };
      };
      notFoundError.name = "NotFound";
      notFoundError.$metadata = { httpStatusCode: 404 };

      mockS3Send.mockRejectedValueOnce(notFoundError);

      const result = await service.exists("nonexistent/file.pdf");

      expect(result).toBe(false);
    });

    it("should throw error on unexpected S3 error", async () => {
      mockS3Send.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(service.exists("test/file.pdf")).rejects.toThrow("Unexpected error");
    });
  });

  describe("presignedUrl", () => {
    it("should generate presigned URL with default expiration", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://s3.example.com/presigned-url?signature=abc");

      const result = await service.presignedUrl("annix-app/test/file.pdf");

      expect(result).toBe("https://s3.example.com/presigned-url?signature=abc");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "annix-app/test/file.pdf",
        }),
        { expiresIn: 3600 },
      );
    });

    it("should generate presigned URL with custom expiration", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://s3.example.com/presigned-url");

      await service.presignedUrl("test/file.pdf", 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 7200,
      });
    });

    it("should throw error on presigned URL generation failure", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Signing failed"));

      await expect(service.presignedUrl("test/file.pdf")).rejects.toThrow("Signing failed");
    });
  });

  describe("publicUrl", () => {
    it("should return S3 public URL format", () => {
      const result = service.publicUrl("annix-app/test/file.pdf");

      expect(result).toBe(
        "https://test-bucket.s3.af-south-1.amazonaws.com/annix-app/test/file.pdf",
      );
    });

    it("should normalize path separators", () => {
      const result = service.publicUrl("path\\with\\backslashes\\file.pdf");

      expect(result).toBe(
        "https://test-bucket.s3.af-south-1.amazonaws.com/path/with/backslashes/file.pdf",
      );
    });

    it("should strip leading slash", () => {
      const result = service.publicUrl("/leading/slash/file.pdf");

      expect(result).toBe("https://test-bucket.s3.af-south-1.amazonaws.com/leading/slash/file.pdf");
    });
  });

  describe("bucket", () => {
    it("should return bucket name", () => {
      expect(service.bucket()).toBe("test-bucket");
    });
  });

  describe("region", () => {
    it("should return region", () => {
      expect(service.region()).toBe("af-south-1");
    });
  });

  describe("onModuleInit", () => {
    it("should not initialize when STORAGE_TYPE is not s3", async () => {
      const localConfigService = {
        get: jest.fn((key: string) => {
          if (key === "STORAGE_TYPE") return "local";
          return mockConfigService.get(key);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3StorageService,
          {
            provide: ConfigService,
            useValue: localConfigService,
          },
        ],
      }).compile();

      const localService = module.get<S3StorageService>(S3StorageService);
      mockS3Send.mockClear();

      await localService.onModuleInit();

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it("should check bucket exists on init when STORAGE_TYPE is s3", async () => {
      mockS3Send.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          _type: "HeadBucket",
        }),
      );
    });
  });
});
