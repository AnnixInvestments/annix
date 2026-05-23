import { BadRequestException, Controller, Get, Header, Param, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  AppBrandingService,
  type BrandingAssetSlot,
  type BrandingView,
} from "./app-branding.service";

const VALID_SLOTS: BrandingAssetSlot[] = [
  "logoIcon",
  "logoLockup",
  "wordmark",
  "favicon",
  "watermark",
];

@ApiTags("Public Branding")
@Controller("public/branding")
export class PublicBrandingController {
  constructor(private readonly brandingService: AppBrandingService) {}

  @Get(":brand")
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=86400")
  @ApiOperation({ summary: "Retrieve a brand's public branding (unauthenticated)" })
  async branding(@Param("brand") brand: string): Promise<BrandingView> {
    return this.brandingService.branding(brand);
  }

  @Get(":brand/asset/:slot")
  @ApiOperation({ summary: "Stream a published branding asset" })
  async asset(
    @Param("brand") brand: string,
    @Param("slot") slot: string,
    @Res() res: Response,
  ): Promise<void> {
    const validSlot = parseSlot(slot);
    const { buffer, mimeType } = await this.brandingService.assetForSlot(brand, validSlot);
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
