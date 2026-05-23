import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { type BrandCode, isBrandCode } from "./branding.constants";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { AppBranding } from "./entities/app-branding.entity";

export type BrandingAssetSlot = "logoIcon" | "logoLockup" | "wordmark" | "favicon" | "watermark";

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
  assets: Record<BrandingAssetSlot, boolean>;
  assetVersion: number;
}

const SLOT_COLUMN: Record<BrandingAssetSlot, keyof AppBranding> = {
  logoIcon: "logoIconPath",
  logoLockup: "logoLockupPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
};

@Injectable()
export class AppBrandingService {
  private readonly logger = new Logger(AppBrandingService.name);

  constructor(
    @InjectRepository(AppBranding)
    private readonly brandingRepo: Repository<AppBranding>,
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
    const row = await this.brandingRepo.findOne({ where: { brandCode: code } });
    if (!row) {
      throw new NotFoundException(`Branding for ${code} not found. Run migrations to seed it.`);
    }
    return row;
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
      assets: {
        logoIcon: row.logoIconPath != null,
        logoLockup: row.logoLockupPath != null,
        wordmark: row.wordmarkPath != null,
        favicon: row.faviconPath != null,
        watermark: row.watermarkPath != null,
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

    if (dto.logoIconPath !== undefined) existing.logoIconPath = dto.logoIconPath;
    if (dto.logoLockupPath !== undefined) existing.logoLockupPath = dto.logoLockupPath;
    if (dto.wordmarkPath !== undefined) existing.wordmarkPath = dto.wordmarkPath;
    if (dto.faviconPath !== undefined) existing.faviconPath = dto.faviconPath;
    if (dto.watermarkPath !== undefined) existing.watermarkPath = dto.watermarkPath;

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
