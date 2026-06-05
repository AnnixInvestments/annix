import { BadRequestException, Controller, Get, Header, Param, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  AppBrandingService,
  type BrandingAssetSlot,
  type BrandingAssetVariant,
  type BrandingImageView,
  type BrandingView,
} from "./app-branding.service";

const VALID_SLOTS: BrandingAssetSlot[] = [
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

@ApiTags("Public Branding")
@Controller("public/branding")
export class PublicBrandingController {
  constructor(private readonly brandingService: AppBrandingService) {}

  @Get(":brand")
  @Header("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
  @ApiOperation({ summary: "Retrieve a brand's public branding (unauthenticated)" })
  async branding(@Param("brand") brand: string): Promise<BrandingView> {
    return this.brandingService.branding(brand);
  }

  @Get(":brand/asset/:slot")
  @ApiOperation({ summary: "Stream a published branding asset" })
  async asset(
    @Param("brand") brand: string,
    @Param("slot") slot: string,
    @Query("variant") variant: string,
    @Res() res: Response,
  ): Promise<void> {
    const validSlot = parseSlot(slot);
    const validVariant = parseVariant(variant);
    const { buffer, mimeType } = await this.brandingService.assetForSlot(
      brand,
      validSlot,
      validVariant,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(buffer);
  }

  @Get(":brand/images")
  @Header("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
  @ApiOperation({ summary: "List a brand's additional gallery images" })
  async images(@Param("brand") brand: string): Promise<BrandingImageView[]> {
    return this.brandingService.listImages(brand);
  }

  @Get(":brand/image/:id")
  @ApiOperation({ summary: "Stream a brand gallery image" })
  async image(
    @Param("brand") brand: string,
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType } = await this.brandingService.galleryImageBytes(brand, id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(buffer);
  }
}

function parseSlot(slot: string): BrandingAssetSlot {
  const match = VALID_SLOTS.find((candidate) => candidate === slot);
  if (!match) {
    throw new BadRequestException(`Unknown branding slot: ${slot}`);
  }
  return match;
}

function parseVariant(variant: string): BrandingAssetVariant {
  return variant === "dark" ? "dark" : "light";
}
