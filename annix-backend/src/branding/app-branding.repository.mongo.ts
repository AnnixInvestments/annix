import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { AppBrandingRepository } from "./app-branding.repository";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";

type AppBrandingDocument = {
  _id: string;
  navbarColor?: string;
  navbarColorLight?: string;
  backgroundLight?: string;
  backgroundDark?: string;
  accentOrange?: string;
  accentOrangeLight?: string;
  accentOrangeDark?: string;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  tagline?: string;
  description?: string;
  heroWords?: string;
  fontDisplay?: string;
  fontHeadings?: string;
  fontBody?: string;
  logoIconPath?: string | null;
  logoLockupPath?: string | null;
  wordmarkPath?: string | null;
  faviconPath?: string | null;
  watermarkPath?: string | null;
  textCropPath?: string | null;
  subMarkPath?: string | null;
  flashLinePath?: string | null;
  heroImagePath?: string | null;
  logoIconPathDark?: string | null;
  logoLockupPathDark?: string | null;
  wordmarkPathDark?: string | null;
  faviconPathDark?: string | null;
  watermarkPathDark?: string | null;
  textCropPathDark?: string | null;
  subMarkPathDark?: string | null;
  flashLinePathDark?: string | null;
  heroImagePathDark?: string | null;
  loginCardPath?: string | null;
  loginCardPathDark?: string | null;
  pageBackgroundPath?: string | null;
  pageBackgroundPathDark?: string | null;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  watermarkMaxSizePx?: number;
  loadingAnimation?: string;
  inheritedFields?: string[];
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type AppBrandingImageDocument = {
  _id: string;
  brandCode?: string;
  label?: string;
  path?: string;
  sortOrder?: number;
  createdAt?: Date | string | null;
};

@Injectable()
export class MongoAppBrandingRepository implements AppBrandingRepository {
  constructor(
    @InjectModel("AppBranding")
    private readonly model: Model<Record<string, unknown>>,
    @InjectModel("AppBrandingImage")
    private readonly imageModel: Model<Record<string, unknown>>,
  ) {}

  private toDate(value: Date | string | null | undefined): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "string") {
      return new Date(value);
    }
    return new Date(0);
  }

  private toDomain(document: AppBrandingDocument): AppBranding {
    return {
      brandCode: document._id,
      navbarColor: document.navbarColor ?? "#323288",
      navbarColorLight: document.navbarColorLight ?? "#F2F4F7",
      backgroundLight: document.backgroundLight ?? "#F8FAFC",
      backgroundDark: document.backgroundDark ?? "#0F172A",
      accentOrange: document.accentOrange ?? "#FF8A00",
      accentOrangeLight: document.accentOrangeLight ?? "#FF9C33",
      accentOrangeDark: document.accentOrangeDark ?? "#CC6900",
      gradientFrom: document.gradientFrom ?? "#1a1a40",
      gradientVia: document.gradientVia ?? "#0d0d20",
      gradientTo: document.gradientTo ?? "#1a1a40",
      tagline: document.tagline ?? "",
      description: document.description ?? "",
      heroWords: document.heroWords ?? "",
      fontDisplay: document.fontDisplay ?? "Orbitron",
      fontHeadings: document.fontHeadings ?? "Exo 2",
      fontBody: document.fontBody ?? "Inter",
      logoIconPath: document.logoIconPath ?? null,
      logoLockupPath: document.logoLockupPath ?? null,
      wordmarkPath: document.wordmarkPath ?? null,
      faviconPath: document.faviconPath ?? null,
      watermarkPath: document.watermarkPath ?? null,
      textCropPath: document.textCropPath ?? null,
      subMarkPath: document.subMarkPath ?? null,
      flashLinePath: document.flashLinePath ?? null,
      heroImagePath: document.heroImagePath ?? null,
      logoIconPathDark: document.logoIconPathDark ?? null,
      logoLockupPathDark: document.logoLockupPathDark ?? null,
      wordmarkPathDark: document.wordmarkPathDark ?? null,
      faviconPathDark: document.faviconPathDark ?? null,
      watermarkPathDark: document.watermarkPathDark ?? null,
      textCropPathDark: document.textCropPathDark ?? null,
      subMarkPathDark: document.subMarkPathDark ?? null,
      flashLinePathDark: document.flashLinePathDark ?? null,
      heroImagePathDark: document.heroImagePathDark ?? null,
      loginCardPath: document.loginCardPath ?? null,
      loginCardPathDark: document.loginCardPathDark ?? null,
      pageBackgroundPath: document.pageBackgroundPath ?? null,
      pageBackgroundPathDark: document.pageBackgroundPathDark ?? null,
      watermarkEnabled: document.watermarkEnabled ?? true,
      watermarkOpacity: document.watermarkOpacity ?? 0.1,
      watermarkMaxSizePx: document.watermarkMaxSizePx ?? 880,
      loadingAnimation: document.loadingAnimation ?? "pulse",
      inheritedFields: document.inheritedFields ?? [],
      createdAt: this.toDate(document.createdAt),
      updatedAt: this.toDate(document.updatedAt),
    };
  }

  private toImageDomain(document: AppBrandingImageDocument): AppBrandingImage {
    return {
      id: document._id,
      brandCode: document.brandCode ?? "",
      label: document.label ?? "",
      path: document.path ?? "",
      sortOrder: document.sortOrder ?? 0,
      createdAt: this.toDate(document.createdAt),
    };
  }

  async findByBrandCode(brandCode: string): Promise<AppBranding | null> {
    const document = await this.model.findById(brandCode).lean<AppBrandingDocument>().exec();
    return document ? this.toDomain(document) : null;
  }

  async save(branding: AppBranding): Promise<AppBranding> {
    const update: Record<string, unknown> = {
      navbarColor: branding.navbarColor,
      navbarColorLight: branding.navbarColorLight,
      backgroundLight: branding.backgroundLight,
      backgroundDark: branding.backgroundDark,
      accentOrange: branding.accentOrange,
      accentOrangeLight: branding.accentOrangeLight,
      accentOrangeDark: branding.accentOrangeDark,
      gradientFrom: branding.gradientFrom,
      gradientVia: branding.gradientVia,
      gradientTo: branding.gradientTo,
      tagline: branding.tagline,
      description: branding.description,
      heroWords: branding.heroWords,
      fontDisplay: branding.fontDisplay,
      fontHeadings: branding.fontHeadings,
      fontBody: branding.fontBody,
      logoIconPath: branding.logoIconPath,
      logoLockupPath: branding.logoLockupPath,
      wordmarkPath: branding.wordmarkPath,
      faviconPath: branding.faviconPath,
      watermarkPath: branding.watermarkPath,
      textCropPath: branding.textCropPath,
      subMarkPath: branding.subMarkPath,
      flashLinePath: branding.flashLinePath,
      heroImagePath: branding.heroImagePath,
      logoIconPathDark: branding.logoIconPathDark,
      logoLockupPathDark: branding.logoLockupPathDark,
      wordmarkPathDark: branding.wordmarkPathDark,
      faviconPathDark: branding.faviconPathDark,
      watermarkPathDark: branding.watermarkPathDark,
      textCropPathDark: branding.textCropPathDark,
      subMarkPathDark: branding.subMarkPathDark,
      flashLinePathDark: branding.flashLinePathDark,
      heroImagePathDark: branding.heroImagePathDark,
      loginCardPath: branding.loginCardPath,
      loginCardPathDark: branding.loginCardPathDark,
      pageBackgroundPath: branding.pageBackgroundPath,
      pageBackgroundPathDark: branding.pageBackgroundPathDark,
      watermarkEnabled: branding.watermarkEnabled,
      watermarkOpacity: branding.watermarkOpacity,
      watermarkMaxSizePx: branding.watermarkMaxSizePx,
      loadingAnimation: branding.loadingAnimation,
      inheritedFields: branding.inheritedFields ?? [],
    };
    const saved = await this.model
      .findByIdAndUpdate(
        branding.brandCode,
        { $set: update, $setOnInsert: { _id: branding.brandCode } },
        { new: true, upsert: true },
      )
      .lean<AppBrandingDocument>()
      .exec();
    return this.toDomain(saved as AppBrandingDocument);
  }

  async listImages(brandCode: string): Promise<AppBrandingImage[]> {
    const documents = await this.imageModel
      .find({ brandCode })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean<AppBrandingImageDocument[]>()
      .exec();
    return documents.map((document) => this.toImageDomain(document));
  }

  async findImage(brandCode: string, id: string): Promise<AppBrandingImage | null> {
    const document = await this.imageModel
      .findOne({ _id: id, brandCode })
      .lean<AppBrandingImageDocument>()
      .exec();
    return document ? this.toImageDomain(document) : null;
  }

  async nextImageSortOrder(brandCode: string): Promise<number> {
    const document = await this.imageModel
      .findOne({ brandCode })
      .sort({ sortOrder: -1 })
      .lean<AppBrandingImageDocument>()
      .exec();
    return document ? (document.sortOrder ?? 0) + 1 : 0;
  }

  async saveImage(image: AppBrandingImage): Promise<AppBrandingImage> {
    const id = image.id || randomUUID();
    const update: Record<string, unknown> = {
      brandCode: image.brandCode,
      label: image.label,
      path: image.path,
      sortOrder: image.sortOrder,
    };
    const saved = await this.imageModel
      .findByIdAndUpdate(
        id,
        { $set: update, $setOnInsert: { _id: id } },
        { new: true, upsert: true },
      )
      .lean<AppBrandingImageDocument>()
      .exec();
    return this.toImageDomain(saved as AppBrandingImageDocument);
  }

  async deleteImage(id: string): Promise<void> {
    await this.imageModel.findByIdAndDelete(id).exec();
  }
}
