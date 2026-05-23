import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { UpdateOrbitBrandingDto } from "../dto/branding.dto";
import { AnnixOrbitBranding } from "../entities/annix-orbit-branding.entity";

export type OrbitBrandingAssetSlot =
  | "logoIcon"
  | "logoLockup"
  | "wordmark"
  | "favicon"
  | "watermark";

export interface OrbitBrandingView {
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
  assets: Record<OrbitBrandingAssetSlot, boolean>;
  assetVersion: number;
}

const SLOT_COLUMN: Record<OrbitBrandingAssetSlot, keyof AnnixOrbitBranding> = {
  logoIcon: "logoIconPath",
  logoLockup: "logoLockupPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
};

const BRANDING_UPLOAD_SUBPATH = "annix-orbit/branding";

@Injectable()
export class OrbitBrandingService {
  private readonly logger = new Logger(OrbitBrandingService.name);

  constructor(
    @InjectRepository(AnnixOrbitBranding)
    private readonly brandingRepo: Repository<AnnixOrbitBranding>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async entity(): Promise<AnnixOrbitBranding> {
    const row = await this.brandingRepo.findOne({ where: { id: 1 } });
    if (!row) {
      throw new NotFoundException("Orbit branding not found. Run migrations to seed it.");
    }
    return row;
  }

  async branding(): Promise<OrbitBrandingView> {
    const row = await this.entity();
    return this.toView(row);
  }

  toView(row: AnnixOrbitBranding): OrbitBrandingView {
    return {
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

  async updateBranding(dto: UpdateOrbitBrandingDto): Promise<OrbitBrandingView> {
    const existing = await this.entity();

    const colorKeys: (keyof UpdateOrbitBrandingDto & keyof AnnixOrbitBranding)[] = [
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
    this.logger.log("Orbit branding updated");
    return this.toView(saved);
  }

  async uploadAsset(file: Express.Multer.File): Promise<{ path: string; previewUrl: string }> {
    const result = await this.storageService.upload(file, BRANDING_UPLOAD_SUBPATH);
    const previewUrl = await this.storageService.presignedUrl(result.path);
    return { path: result.path, previewUrl };
  }

  async assetForSlot(slot: OrbitBrandingAssetSlot): Promise<{ buffer: Buffer; mimeType: string }> {
    const row = await this.entity();
    const column = SLOT_COLUMN[slot];
    const path = row[column] as string | null;
    if (!path) {
      throw new NotFoundException(`No custom asset set for ${slot}`);
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
