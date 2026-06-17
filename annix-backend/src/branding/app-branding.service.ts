import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { AppBrandingRepository } from "./app-branding.repository";
import {
  type BrandCode,
  brandLocksGlobals,
  GLOBAL_LOCKED_ASSET_SLOTS,
  GLOBAL_LOCKED_SCALAR_FIELDS,
  INHERITABLE_SCALAR_FIELDS,
  isBrandCode,
  MASTER_BRAND_CODE,
  type PlatformBrandingScalars,
} from "./branding.constants";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";

export type BrandingAssetSlot =
  | "logoIcon"
  | "logoLockup"
  | "wordmark"
  | "favicon"
  | "watermark"
  | "textCrop"
  | "subMark"
  | "flashLine"
  | "heroImage"
  | "loginCard"
  | "pageBackground"
  | "heroTop"
  | "heroBottom";

export type BrandingAssetVariant = "light" | "dark";

export interface BrandingView {
  brandCode: string;
  navbarColor: string;
  navbarColorLight: string;
  backgroundLight: string;
  backgroundDark: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  tagline: string;
  description: string;
  heroWords: string;
  fontDisplay: string;
  fontHeadings: string;
  fontBody: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  loadingAnimation: string;
  heroTopHeightPct: number;
  heroBottomHeightPct: number;
  heroTopFadePct: number;
  heroBottomFadePct: number;
  assets: Record<BrandingAssetSlot, boolean>;
  assetsDark: Record<BrandingAssetSlot, boolean>;
  assetVersion: number;
}

export interface BrandingImageView {
  id: string;
  label: string;
}

export interface BrandingAdminView {
  brandCode: string;
  isMaster: boolean;
  inheritedFields: string[];
  lockedScalarFields: string[];
  lockedAssetSlots: BrandingAssetSlot[];
  own: BrandingView;
  master: BrandingView;
  effective: BrandingView;
}

const SLOT_COLUMN: Record<
  BrandingAssetSlot,
  { light: keyof AppBranding; dark: keyof AppBranding }
> = {
  logoIcon: { light: "logoIconPath", dark: "logoIconPathDark" },
  logoLockup: { light: "logoLockupPath", dark: "logoLockupPathDark" },
  wordmark: { light: "wordmarkPath", dark: "wordmarkPathDark" },
  favicon: { light: "faviconPath", dark: "faviconPathDark" },
  watermark: { light: "watermarkPath", dark: "watermarkPathDark" },
  textCrop: { light: "textCropPath", dark: "textCropPathDark" },
  subMark: { light: "subMarkPath", dark: "subMarkPathDark" },
  flashLine: { light: "flashLinePath", dark: "flashLinePathDark" },
  heroImage: { light: "heroImagePath", dark: "heroImagePathDark" },
  loginCard: { light: "loginCardPath", dark: "loginCardPathDark" },
  pageBackground: { light: "pageBackgroundPath", dark: "pageBackgroundPathDark" },
  heroTop: { light: "heroTopPath", dark: "heroTopPathDark" },
  heroBottom: { light: "heroBottomPath", dark: "heroBottomPathDark" },
};

const ASSET_SLOTS: BrandingAssetSlot[] = [
  "logoIcon",
  "logoLockup",
  "wordmark",
  "favicon",
  "watermark",
  "textCrop",
  "subMark",
  "flashLine",
  "heroImage",
  "loginCard",
  "pageBackground",
  "heroTop",
  "heroBottom",
];

const PATH_COLUMNS: (keyof AppBranding)[] = ASSET_SLOTS.flatMap((slot) => [
  SLOT_COLUMN[slot].light,
  SLOT_COLUMN[slot].dark,
]);

@Injectable()
export class AppBrandingService {
  private readonly logger = new Logger(AppBrandingService.name);

  // Public asset streaming (logos, hero images) is the hottest branding route
  // and previously re-queried the DB twice and re-downloaded from object
  // storage on every request (~2s p95). These assets are small and change
  // rarely, so we cache the resolved bytes in-memory with a short TTL and
  // invalidate on any branding write.
  private static readonly ASSET_CACHE_TTL_MS = 5 * 60 * 1000;
  private static readonly ASSET_CACHE_MAX_ENTRIES = 96;
  private static readonly ASSET_CACHE_MAX_BYTES = 8 * 1024 * 1024;
  private readonly assetCache = new Map<
    string,
    { buffer: Buffer; mimeType: string; expiresAt: number }
  >();

  constructor(
    private readonly brandingRepo: AppBrandingRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  private invalidateAssetCache(): void {
    this.assetCache.clear();
  }

  private cacheAsset(key: string, buffer: Buffer, mimeType: string): void {
    if (buffer.byteLength > AppBrandingService.ASSET_CACHE_MAX_BYTES) {
      return;
    }
    // Refreshing the key keeps it newest for insertion-order eviction below.
    this.assetCache.delete(key);
    this.assetCache.set(key, {
      buffer,
      mimeType,
      expiresAt: Date.now() + AppBrandingService.ASSET_CACHE_TTL_MS,
    });
    while (this.assetCache.size > AppBrandingService.ASSET_CACHE_MAX_ENTRIES) {
      const oldest = this.assetCache.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.assetCache.delete(oldest);
    }
  }

  private assertBrand(brand: string): BrandCode {
    if (!isBrandCode(brand)) {
      throw new BadRequestException(`Unknown brand: ${brand}`);
    }
    return brand;
  }

  private lockedScalars(brand: string): string[] {
    return brandLocksGlobals(brand) ? [...GLOBAL_LOCKED_SCALAR_FIELDS] : [];
  }

  private lockedSlots(brand: string): BrandingAssetSlot[] {
    return brandLocksGlobals(brand) ? [...GLOBAL_LOCKED_ASSET_SLOTS] : [];
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
      navbarColorLight: "#F2F4F7",
      backgroundLight: "#0a1733",
      backgroundDark: "#0a1733",
      accentOrange: "#FF8A00",
      accentOrangeLight: "#FF9C33",
      accentOrangeDark: "#CC6900",
      gradientFrom: "#0b1b3a",
      gradientVia: "#0a1733",
      gradientTo: "#070f24",
      tagline: "",
      description: "",
      heroWords: "",
      fontDisplay: "Orbitron",
      fontHeadings: "Exo 2",
      fontBody: "Inter",
      logoIconPath: null,
      logoLockupPath: null,
      wordmarkPath: null,
      faviconPath: null,
      watermarkPath: null,
      textCropPath: null,
      subMarkPath: null,
      flashLinePath: null,
      heroImagePath: null,
      logoIconPathDark: null,
      logoLockupPathDark: null,
      wordmarkPathDark: null,
      faviconPathDark: null,
      watermarkPathDark: null,
      textCropPathDark: null,
      subMarkPathDark: null,
      flashLinePathDark: null,
      heroImagePathDark: null,
      loginCardPath: null,
      loginCardPathDark: null,
      pageBackgroundPath: null,
      pageBackgroundPathDark: null,
      heroTopPath: null,
      heroTopPathDark: null,
      heroBottomPath: null,
      heroBottomPathDark: null,
      watermarkEnabled: true,
      watermarkOpacity: 0.1,
      watermarkMaxSizePx: 880,
      loadingAnimation: "pulse",
      heroTopHeightPct: 60,
      heroBottomHeightPct: 40,
      heroTopFadePct: 45,
      heroBottomFadePct: 45,
      inheritedFields: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private async rawRow(brand: BrandCode): Promise<AppBranding> {
    const row = await this.brandingRepo.findByBrandCode(brand);
    return row ?? this.defaultBranding(brand);
  }

  async branding(brand: string): Promise<BrandingView> {
    const code = this.assertBrand(brand);
    const app = await this.rawRow(code);
    if (code === MASTER_BRAND_CODE) {
      return composeView(app, app, [], true, []);
    }
    const master = await this.rawRow(MASTER_BRAND_CODE);
    const inherited = Array.from(
      new Set([...(app.inheritedFields ?? []), ...this.lockedScalars(code)]),
    );
    return composeView(app, master, inherited, false, this.lockedSlots(code));
  }

  async adminBranding(brand: string): Promise<BrandingAdminView> {
    const code = this.assertBrand(brand);
    const app = await this.rawRow(code);
    const isMaster = code === MASTER_BRAND_CODE;
    const master = isMaster ? app : await this.rawRow(MASTER_BRAND_CODE);
    const ownInherited = isMaster ? [] : (app.inheritedFields ?? []);
    const lockedScalarFields = this.lockedScalars(code);
    const lockedAssetSlots = this.lockedSlots(code);
    const effectiveInherited = Array.from(new Set([...ownInherited, ...lockedScalarFields]));
    return {
      brandCode: code,
      isMaster,
      inheritedFields: ownInherited,
      lockedScalarFields,
      lockedAssetSlots,
      own: composeView(app, app, [], true, []),
      master: composeView(master, master, [], true, []),
      effective: composeView(app, master, effectiveInherited, isMaster, lockedAssetSlots),
    };
  }

  async updateBranding(brand: string, dto: UpdateBrandingDto): Promise<BrandingView> {
    const existing = await this.entity(brand);
    const locksGlobals = brandLocksGlobals(brand);
    const lockedColumns = locksGlobals
      ? new Set<keyof AppBranding>(
          GLOBAL_LOCKED_ASSET_SLOTS.flatMap((slot) => [
            SLOT_COLUMN[slot].light,
            SLOT_COLUMN[slot].dark,
          ]),
        )
      : new Set<keyof AppBranding>();

    const colorKeys: (keyof UpdateBrandingDto & keyof AppBranding)[] = [
      "navbarColor",
      "navbarColorLight",
      "backgroundLight",
      "backgroundDark",
      "accentOrange",
      "accentOrangeLight",
      "accentOrangeDark",
      "gradientFrom",
      "gradientVia",
      "gradientTo",
    ];
    if (!locksGlobals) {
      colorKeys.forEach((key) => {
        const value = dto[key];
        if (value !== undefined) {
          existing[key] = value as never;
        }
      });
      if (dto.heroTopHeightPct !== undefined) existing.heroTopHeightPct = dto.heroTopHeightPct;
      if (dto.heroBottomHeightPct !== undefined)
        existing.heroBottomHeightPct = dto.heroBottomHeightPct;
      if (dto.heroTopFadePct !== undefined) existing.heroTopFadePct = dto.heroTopFadePct;
      if (dto.heroBottomFadePct !== undefined) existing.heroBottomFadePct = dto.heroBottomFadePct;
    }

    if (dto.tagline !== undefined) existing.tagline = dto.tagline;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.heroWords !== undefined) existing.heroWords = dto.heroWords;
    if (dto.fontDisplay !== undefined) existing.fontDisplay = dto.fontDisplay;
    if (dto.fontHeadings !== undefined) existing.fontHeadings = dto.fontHeadings;
    if (dto.fontBody !== undefined) existing.fontBody = dto.fontBody;

    if (dto.watermarkEnabled !== undefined) existing.watermarkEnabled = dto.watermarkEnabled;
    if (dto.watermarkOpacity !== undefined) existing.watermarkOpacity = dto.watermarkOpacity;
    if (dto.watermarkMaxSizePx !== undefined) existing.watermarkMaxSizePx = dto.watermarkMaxSizePx;
    if (dto.loadingAnimation !== undefined) existing.loadingAnimation = dto.loadingAnimation;

    const dtoRecord = dto as unknown as Record<string, string | null | undefined>;
    PATH_COLUMNS.forEach((column) => {
      if (lockedColumns.has(column)) {
        return;
      }
      const value = dtoRecord[column];
      if (value !== undefined) {
        existing[column] = value as never;
      }
    });

    if (dto.inheritedFields !== undefined) {
      const allowed = dto.inheritedFields.filter((field) =>
        (INHERITABLE_SCALAR_FIELDS as readonly string[]).includes(field),
      );
      existing.inheritedFields = brand === MASTER_BRAND_CODE ? [] : allowed;
    }

    const saved = await this.brandingRepo.save(existing);
    // A write may change asset paths (incl. master cascading to inheritors),
    // so drop the whole asset cache rather than guess affected keys.
    this.invalidateAssetCache();
    this.logger.log(`Branding updated for ${saved.brandCode}`);
    return this.branding(saved.brandCode);
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
    variant: BrandingAssetVariant = "light",
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const code = this.assertBrand(brand);
    const cacheKey = `${code}:${slot}:${variant}`;
    const cached = this.assetCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { buffer: cached.buffer, mimeType: cached.mimeType };
    }

    const column = SLOT_COLUMN[slot][variant];
    const app = await this.rawRow(code);
    const locked =
      brandLocksGlobals(code) && (GLOBAL_LOCKED_ASSET_SLOTS as readonly string[]).includes(slot);
    const ownPath = locked ? null : (app[column] as string | null);
    const masterPath =
      code === MASTER_BRAND_CODE
        ? null
        : ((await this.rawRow(MASTER_BRAND_CODE))[column] as string | null);
    const path = ownPath ?? masterPath;
    if (!path) {
      throw new NotFoundException(`No custom ${variant} asset set for ${brand}/${slot}`);
    }
    const buffer = await this.storageService.download(path);
    const mimeType = mimeTypeForPath(path);
    this.cacheAsset(cacheKey, buffer, mimeType);
    return { buffer, mimeType };
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

function pickScalars(row: AppBranding): PlatformBrandingScalars {
  return {
    navbarColor: row.navbarColor,
    navbarColorLight: row.navbarColorLight,
    backgroundLight: row.backgroundLight,
    backgroundDark: row.backgroundDark,
    accentOrange: row.accentOrange,
    accentOrangeLight: row.accentOrangeLight,
    accentOrangeDark: row.accentOrangeDark,
    gradientFrom: row.gradientFrom,
    gradientVia: row.gradientVia,
    gradientTo: row.gradientTo,
    tagline: row.tagline,
    description: row.description,
    heroWords: row.heroWords,
    fontDisplay: row.fontDisplay,
    fontHeadings: row.fontHeadings,
    fontBody: row.fontBody,
    watermarkEnabled: row.watermarkEnabled,
    watermarkOpacity: row.watermarkOpacity,
    watermarkMaxSizePx: row.watermarkMaxSizePx,
    loadingAnimation: row.loadingAnimation,
    heroTopHeightPct: row.heroTopHeightPct,
    heroBottomHeightPct: row.heroBottomHeightPct,
    heroTopFadePct: row.heroTopFadePct,
    heroBottomFadePct: row.heroBottomFadePct,
  };
}

function mergeScalars(
  own: PlatformBrandingScalars,
  master: PlatformBrandingScalars,
  inheritedFields: string[],
): PlatformBrandingScalars {
  const masterRecord = master as unknown as Record<string, unknown>;
  return INHERITABLE_SCALAR_FIELDS.reduce<PlatformBrandingScalars>(
    (acc, field) =>
      inheritedFields.includes(field) ? { ...acc, [field]: masterRecord[field] } : acc,
    { ...own },
  );
}

function composeView(
  app: AppBranding,
  master: AppBranding,
  inheritedFields: string[],
  isMaster: boolean,
  lockedAssetSlots: BrandingAssetSlot[],
): BrandingView {
  const own = pickScalars(app);
  const scalars = isMaster ? own : mergeScalars(own, pickScalars(master), inheritedFields);
  const present = (ownPath: string | null, masterPath: string | null): boolean =>
    ownPath != null || (!isMaster && masterPath != null);
  const presence = (variant: BrandingAssetVariant): Record<BrandingAssetSlot, boolean> =>
    ASSET_SLOTS.reduce<Record<BrandingAssetSlot, boolean>>(
      (acc, slot) => {
        const column = SLOT_COLUMN[slot][variant];
        const locked = lockedAssetSlots.includes(slot);
        const ownValue = locked ? null : (app[column] as string | null);
        acc[slot] = present(ownValue, master[column] as string | null);
        return acc;
      },
      {} as Record<BrandingAssetSlot, boolean>,
    );
  const appTime = app.updatedAt ? app.updatedAt.getTime() : 0;
  const masterTime = master.updatedAt ? master.updatedAt.getTime() : 0;
  return {
    brandCode: app.brandCode,
    ...scalars,
    assets: presence("light"),
    assetsDark: presence("dark"),
    assetVersion: isMaster ? appTime : Math.max(appTime, masterTime),
  };
}
