import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';
import { Readable } from 'stream';

// Mock the entire AWS SDK modules
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, type: 'PutObjectCommand' })),
  GetObjectCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, type: 'GetObjectCommand' })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({
    ...params,
    type: 'DeleteObjectCommand',
  })),
  HeadObjectCommand: jest
    .fn()
    .mockImplementation((params) => ({ ...params, type: 'HeadObjectCommand' })),
}));

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

describe('S3StorageService', () => {
  let service: S3StorageService;

  const mockConfig: Record<string, string | number> = {
    AWS_REGION: 'af-south-1',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_ACCESS_KEY_ID: 'test-access-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
    AWS_S3_URL_EXPIRATION: 3600,
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a file to S3', async () => {
      const mockFile: Express.Multer.File = {
        originalname: 'test-file.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 12,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as unknown as Readable,
      };

      mockSend.mockResolvedValueOnce({});
      mockGetSignedUrl.mockResolvedValueOnce('https://presigned-url.com/test');

      const result = await service.upload(mockFile, 'documents');

      expect(mockSend).toHaveBeenCalled();
      expect(result).toMatchObject({
        size: 12,
        mimeType: 'application/pdf',
        originalFilename: 'test-file.pdf',
      });
      expect(result.path).toMatch(/^documents\/[a-f0-9-]+\.pdf$/);
    });

    it('should throw an error when upload fails', async () => {
      const mockFile: Express.Multer.File = {
        originalname: 'test-file.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 12,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as unknown as Readable,
      };

      mockSend.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(service.upload(mockFile, 'documents')).rejects.toThrow(
        'Upload failed',
      );
    });
  });

  describe('download', () => {
    it('should download a file from S3', async () => {
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('test content');
        },
      };

      mockSend.mockResolvedValueOnce({ Body: mockBody });

      const result = await service.download('documents/test-file.pdf');

      expect(mockSend).toHaveBeenCalled();
      expect(result.toString()).toBe('test content');
    });

    it('should throw NotFoundException when file does not exist', async () => {
      const error = new Error('NoSuchKey') as Error & { name: string };
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValueOnce(error);

      await expect(
        service.download('documents/nonexistent.pdf'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when Body is empty', async () => {
      mockSend.mockResolvedValueOnce({ Body: null });

      await expect(service.download('documents/test-file.pdf')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a file from S3', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.delete('documents/test-file.pdf');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw an error when delete fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.delete('documents/test-file.pdf')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.exists('documents/test-file.pdf');

      expect(mockSend).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const error = new Error('NotFound') as Error & { name: string };
      error.name = 'NotFound';
      mockSend.mockRejectedValueOnce(error);

      const result = await service.exists('documents/nonexistent.pdf');

      expect(result).toBe(false);
    });

    it('should throw an error for other S3 errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      await expect(service.exists('documents/test-file.pdf')).rejects.toThrow(
        'S3 error',
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should return the correct S3 URL', () => {
      const result = service.getPublicUrl('documents/test-file.pdf');

      expect(result).toBe(
        'https://test-bucket.s3.af-south-1.amazonaws.com/documents/test-file.pdf',
      );
    });

    it('should normalize Windows-style paths', () => {
      const result = service.getPublicUrl(
        'documents\\subfolder\\test-file.pdf',
      );

      expect(result).toBe(
        'https://test-bucket.s3.af-south-1.amazonaws.com/documents/subfolder/test-file.pdf',
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL', async () => {
      const mockUrl = 'https://presigned-url.com/test?signature=abc';
      mockGetSignedUrl.mockResolvedValueOnce(mockUrl);

      const result = await service.getPresignedUrl('documents/test-file.pdf');

      expect(mockGetSignedUrl).toHaveBeenCalled();
      expect(result).toBe(mockUrl);
    });

    it('should use custom expiration time', async () => {
      const mockUrl = 'https://presigned-url.com/test?signature=abc';
      mockGetSignedUrl.mockResolvedValueOnce(mockUrl);

      await service.getPresignedUrl('documents/test-file.pdf', 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 7200 }),
      );
    });
  });

  describe('getBucket', () => {
    it('should return the bucket name', () => {
      expect(service.getBucket()).toBe('test-bucket');
    });
  });

  describe('getRegion', () => {
    it('should return the region', () => {
      expect(service.getRegion()).toBe('af-south-1');
    });
  });
});
