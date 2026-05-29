import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { AppBrandingRepository } from "./app-branding.repository";
import { type BrandCode, isBrandCode } from "./branding.constants";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";

export type BrandingAssetSlot =
  | "logoIcon"
  | "logoLockup"
  | "wordmark"
  | "favicon"
  | "watermark"
  | "textCrop";

export interface BrandingView {
  brandCode: string;
  navbarColor: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  tagline: string;
  description: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  loadingAnimation: string;
  assets: Record<BrandingAssetSlot, boolean>;
  assetVersion: number;
}

export interface BrandingImageView {
  id: string;
  label: string;
}

const SLOT_COLUMN: Record<BrandingAssetSlot, keyof AppBranding> = {
  logoIcon: "logoIconPath",
  logoLockup: "logoLockupPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
  textCrop: "textCropPath",
};

@Injectable()
export class AppBrandingService {
  private readonly logger = new Logger(AppBrandingService.name);

  constructor(
    private readonly brandingRepo: AppBrandingRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  private assertBrand(brand: string): BrandCode {
    if (!isBrandCode(brand)) {
      throw new BadRequestException(`Unknown brand: ${brand}`);
    }
    return brand;
  }

  async entity(brand: string): Promise<AppBranding> {
    const code = this.assertBrand(brand);
    const row = await this.brandingRepo.findByBrandCode(code);
    if (row) {
      return row;
    }
    return this.defaultBranding(code);
  }

  private defaultBranding(code: BrandCode): AppBranding {
    const timestamp = now().toJSDate();
    return {
      brandCode: code,
      navbarColor: "#323288",
      accentOrange: "#FF8A00",
      accentOrangeLight: "#FF9C33",
      accentOrangeDark: "#CC6900",
      gradientFrom: "#1a1a40",
      gradientVia: "#0d0d20",
      gradientTo: "#1a1a40",
      tagline: "",
      description: "",
      logoIconPath: null,
      logoLockupPath: null,
      wordmarkPath: null,
      faviconPath: null,
      watermarkPath: null,
      textCropPath: null,
      watermarkEnabled: true,
      watermarkOpacity: 0.1,
      watermarkMaxSizePx: 880,
      loadingAnimation: "pulse",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async branding(brand: string): Promise<BrandingView> {
    const row = await this.entity(brand);
    return this.toView(row);
  }

  toView(row: AppBranding): BrandingView {
    return {
      brandCode: row.brandCode,
      navbarColor: row.navbarColor,
      accentOrange: row.accentOrange,
      accentOrangeLight: row.accentOrangeLight,
      accentOrangeDark: row.accentOrangeDark,
      gradientFrom: row.gradientFrom,
      gradientVia: row.gradientVia,
      gradientTo: row.gradientTo,
      tagline: row.tagline,
      description: row.description,
      watermarkEnabled: row.watermarkEnabled,
      watermarkOpacity: row.watermarkOpacity,
      watermarkMaxSizePx: row.watermarkMaxSizePx,
      loadingAnimation: row.loadingAnimation,
      assets: {
        logoIcon: row.logoIconPath != null,
        logoLockup: row.logoLockupPath != null,
        wordmark: row.wordmarkPath != null,
        favicon: row.faviconPath != null,
        watermark: row.watermarkPath != null,
        textCrop: row.textCropPath != null,
      },
      assetVersion: row.updatedAt ? row.updatedAt.getTime() : 0,
    };
  }

  async updateBranding(brand: string, dto: UpdateBrandingDto): Promise<BrandingView> {
    const existing = await this.entity(brand);

    const colorKeys: (keyof UpdateBrandingDto & keyof AppBranding)[] = [
      "navbarColor",
      "accentOrange",
      "accentOrangeLight",
      "accentOrangeDark",
      "gradientFrom",
      "gradientVia",
      "gradientTo",
    ];
    colorKeys.forEach((key) => {
      const value = dto[key];
      if (value !== undefined) {
        existing[key] = value as never;
      }
    });

    if (dto.tagline !== undefined) existing.tagline = dto.tagline;
    if (dto.description !== undefined) existing.description = dto.description;

    if (dto.watermarkEnabled !== undefined) existing.watermarkEnabled = dto.watermarkEnabled;
    if (dto.watermarkOpacity !== undefined) existing.watermarkOpacity = dto.watermarkOpacity;
    if (dto.watermarkMaxSizePx !== undefined) existing.watermarkMaxSizePx = dto.watermarkMaxSizePx;
    if (dto.loadingAnimation !== undefined) existing.loadingAnimation = dto.loadingAnimation;

    if (dto.logoIconPath !== undefined) existing.logoIconPath = dto.logoIconPath;
    if (dto.logoLockupPath !== undefined) existing.logoLockupPath = dto.logoLockupPath;
    if (dto.wordmarkPath !== undefined) existing.wordmarkPath = dto.wordmarkPath;
    if (dto.faviconPath !== undefined) existing.faviconPath = dto.faviconPath;
    if (dto.watermarkPath !== undefined) existing.watermarkPath = dto.watermarkPath;
    if (dto.textCropPath !== undefined) existing.textCropPath = dto.textCropPath;

    const saved = await this.brandingRepo.save(existing);
    this.logger.log(`Branding updated for ${saved.brandCode}`);
    return this.toView(saved);
  }

  async uploadAsset(
    brand: string,
    file: Express.Multer.File,
  ): Promise<{ path: string; previewUrl: string }> {
    const code = this.assertBrand(brand);
    const result = await this.storageService.upload(file, `branding/${code}`);
    const previewUrl = await this.storageService.presignedUrl(result.path);
    return { path: result.path, previewUrl };
  }

  async assetForSlot(
    brand: string,
    slot: BrandingAssetSlot,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const row = await this.entity(brand);
    const column = SLOT_COLUMN[slot];
    const path = row[column] as string | null;
    if (!path) {
      throw new NotFoundException(`No custom asset set for ${brand}/${slot}`);
    }
    const buffer = await this.storageService.download(path);
    return { buffer, mimeType: mimeTypeForPath(path) };
  }

  async listImages(brand: string): Promise<BrandingImageView[]> {
    const code = this.assertBrand(brand);
    const rows = await this.brandingRepo.listImages(code);
    return rows.map((row) => ({ id: row.id, label: row.label }));
  }

  async addImage(
    brand: string,
    label: string,
    file: Express.Multer.File,
  ): Promise<BrandingImageView> {
    const code = this.assertBrand(brand);
    const uploaded = await this.storageService.upload(file, `branding/${code}/gallery`);
    const nextOrder = await this.brandingRepo.nextImageSortOrder(code);
    const image = {
      brandCode: code,
      label: label.trim().slice(0, 200),
      path: uploaded.path,
      sortOrder: nextOrder,
    } as AppBrandingImage;
    const saved = await this.brandingRepo.saveImage(image);
    this.logger.log(`Branding gallery image added for ${code}: ${saved.id}`);
    return { id: saved.id, label: saved.label };
  }

  async deleteImage(brand: string, id: string): Promise<void> {
    const code = this.assertBrand(brand);
    const row = await this.brandingRepo.findImage(code, id);
    if (!row) {
      throw new NotFoundException(`Gallery image ${id} not found for ${code}`);
    }
    await this.storageService.delete(row.path).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete gallery file for ${id}: ${message}`);
    });
    await this.brandingRepo.deleteImage(row.id);
  }

  async galleryImageBytes(
    brand: string,
    id: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const code = this.assertBrand(brand);
    const row = await this.brandingRepo.findImage(code, id);
    if (!row) {
      throw new NotFoundException(`Gallery image ${id} not found for ${code}`);
    }
    const buffer = await this.storageService.download(row.path);
    return { buffer, mimeType: mimeTypeForPath(row.path) };
  }
}

function mimeTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}
