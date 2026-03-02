import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import sharp from "sharp";
import { Repository } from "typeorm";
import { PublicBrandingDto } from "../dto/public-branding.dto";
import { BrandingType, StockControlCompany } from "../entities/stock-control-company.entity";

interface CachedIcon {
  buffer: Buffer;
  timestamp: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PublicBrandingService {
  private readonly logger = new Logger(PublicBrandingService.name);
  private readonly iconCache = new Map<string, CachedIcon>();

  constructor(
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
  ) {}

  async publicBrandingInfo(companyId: number): Promise<PublicBrandingDto | null> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company) {
      return null;
    }

    return {
      companyName: company.name,
      brandingType: company.brandingType,
      primaryColor: company.primaryColor,
      accentColor: company.accentColor,
      hasCustomLogo: company.brandingType === BrandingType.CUSTOM && !!company.logoUrl,
    };
  }

  async brandingIcon(companyId: number, size: 192 | 512): Promise<Buffer | null> {
    const cacheKey = `${companyId}-${size}`;
    const cached = this.iconCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.buffer;
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company) {
      return null;
    }

    if (company.brandingType !== BrandingType.CUSTOM || !company.logoUrl) {
      return null;
    }

    const iconBuffer = await this.fetchAndResizeIcon(company.logoUrl, size);

    if (iconBuffer) {
      this.iconCache.set(cacheKey, { buffer: iconBuffer, timestamp: Date.now() });
    }

    return iconBuffer;
  }

  private async fetchAndResizeIcon(logoUrl: string, size: number): Promise<Buffer | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(logoUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Failed to fetch logo from ${logoUrl}: ${response.status}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      const resized = await sharp(buffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toBuffer();

      return resized;
    } catch (error) {
      this.logger.warn(
        `Icon processing failed for ${logoUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  clearIconCache(companyId?: number): void {
    if (companyId !== undefined) {
      this.iconCache.delete(`${companyId}-192`);
      this.iconCache.delete(`${companyId}-512`);
    } else {
      this.iconCache.clear();
    }
  }
}
