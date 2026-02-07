import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { PumpProduct } from "./entities/pump-product.entity";

export interface DatasheetUploadResult {
  productId: number;
  datasheetUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface ImageUploadResult {
  productId: number;
  imageUrl: string;
  filename: string;
  size: number;
}

export interface PumpCurveUploadResult {
  productId: number;
  curveImageUrl: string;
  extractedData: PumpCurveData | null;
}

export interface PumpCurveData {
  flowPoints: number[];
  headPoints: number[];
  efficiencyPoints?: number[];
  npshPoints?: number[];
  powerPoints?: number[];
  bepFlow?: number;
  bepHead?: number;
  bepEfficiency?: number;
  shutoffHead?: number;
  maxFlow?: number;
  speed?: number;
  impellerDiameter?: number;
  extractedFrom?: string;
}

const ALLOWED_DATASHEET_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ALLOWED_CURVE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Injectable()
export class PumpDatasheetService {
  private readonly logger = new Logger(PumpDatasheetService.name);

  constructor(
    @InjectRepository(PumpProduct)
    private readonly productRepository: Repository<PumpProduct>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async uploadDatasheet(
    productId: number,
    file: Express.Multer.File,
  ): Promise<DatasheetUploadResult> {
    if (!ALLOWED_DATASHEET_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Invalid file type. Allowed types: PDF, DOC, DOCX");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.datasheetUrl) {
      try {
        const oldPath = this.extractPathFromUrl(product.datasheetUrl);
        await this.storageService.delete(oldPath);
        this.logger.debug(`Deleted old datasheet: ${oldPath}`);
      } catch (error) {
        this.logger.warn(`Could not delete old datasheet: ${error}`);
      }
    }

    const subPath = `pump-products/${productId}/datasheets`;
    const result = await this.storageService.upload(file, subPath);

    product.datasheetUrl = result.url;
    await this.productRepository.save(product);

    this.logger.log(`Uploaded datasheet for product ${productId}: ${result.path}`);

    return {
      productId,
      datasheetUrl: result.url,
      filename: result.originalFilename,
      size: result.size,
      mimeType: result.mimeType,
    };
  }

  async uploadProductImage(
    productId: number,
    file: Express.Multer.File,
  ): Promise<ImageUploadResult> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Invalid file type. Allowed types: JPEG, PNG, WebP, GIF");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.imageUrl) {
      try {
        const oldPath = this.extractPathFromUrl(product.imageUrl);
        await this.storageService.delete(oldPath);
      } catch (error) {
        this.logger.warn(`Could not delete old image: ${error}`);
      }
    }

    const subPath = `pump-products/${productId}/images`;
    const result = await this.storageService.upload(file, subPath);

    product.imageUrl = result.url;
    await this.productRepository.save(product);

    this.logger.log(`Uploaded image for product ${productId}: ${result.path}`);

    return {
      productId,
      imageUrl: result.url,
      filename: result.originalFilename,
      size: result.size,
    };
  }

  async uploadPumpCurve(
    productId: number,
    file: Express.Multer.File,
    manualCurveData?: PumpCurveData,
  ): Promise<PumpCurveUploadResult> {
    if (!ALLOWED_CURVE_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Invalid file type. Allowed types: JPEG, PNG, WebP");
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const subPath = `pump-products/${productId}/curves`;
    const result = await this.storageService.upload(file, subPath);

    const curveData = manualCurveData || null;

    if (curveData) {
      curveData.extractedFrom = result.path;
    }

    product.pumpCurveData = curveData as Record<string, any>;
    if (!product.specifications) {
      product.specifications = {};
    }
    product.specifications["curveImageUrl"] = result.url;
    await this.productRepository.save(product);

    this.logger.log(`Uploaded pump curve for product ${productId}: ${result.path}`);

    return {
      productId,
      curveImageUrl: result.url,
      extractedData: curveData,
    };
  }

  async updatePumpCurveData(productId: number, curveData: PumpCurveData): Promise<PumpProduct> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    product.pumpCurveData = curveData as Record<string, any>;

    if (curveData.bepFlow && curveData.maxFlow) {
      product.flowRateMin = curveData.bepFlow * 0.7;
      product.flowRateMax = curveData.maxFlow;
    }

    if (curveData.shutoffHead && curveData.bepHead) {
      product.headMin = curveData.bepHead * 0.5;
      product.headMax = curveData.shutoffHead;
    }

    await this.productRepository.save(product);
    this.logger.log(`Updated pump curve data for product ${productId}`);

    return product;
  }

  async deleteDatasheet(productId: number): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.datasheetUrl) {
      throw new BadRequestException("Product has no datasheet");
    }

    const path = this.extractPathFromUrl(product.datasheetUrl);
    await this.storageService.delete(path);

    product.datasheetUrl = null;
    await this.productRepository.save(product);

    this.logger.log(`Deleted datasheet for product ${productId}`);
  }

  async downloadDatasheet(productId: number): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.datasheetUrl) {
      throw new NotFoundException("Product has no datasheet");
    }

    const path = this.extractPathFromUrl(product.datasheetUrl);
    const buffer = await this.storageService.download(path);

    const filename = `${product.sku}-datasheet.pdf`;
    const mimeType = "application/pdf";

    return { buffer, filename, mimeType };
  }

  private extractPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/^\//, "");
    } catch {
      return url;
    }
  }
}
