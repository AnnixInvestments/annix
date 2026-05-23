import { BadRequestException, Controller, Get, Header, Param, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  type OrbitBrandingAssetSlot,
  OrbitBrandingService,
  type OrbitBrandingView,
} from "../services/orbit-branding.service";

const VALID_SLOTS: OrbitBrandingAssetSlot[] = ["logoIcon", "wordmark", "favicon", "watermark"];

@ApiTags("Public Annix Orbit Branding")
@Controller("public/annix-orbit/branding")
export class PublicOrbitBrandingController {
  constructor(private readonly brandingService: OrbitBrandingService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=86400")
  @ApiOperation({ summary: "Retrieve public Annix Orbit branding (unauthenticated)" })
  async branding(): Promise<OrbitBrandingView> {
    return this.brandingService.branding();
  }

  @Get("asset/:slot")
  @ApiOperation({ summary: "Stream a published branding asset (favicon/logo/wordmark/watermark)" })
  async asset(@Param("slot") slot: string, @Res() res: Response): Promise<void> {
    const validSlot = parseSlot(slot);
    const { buffer, mimeType } = await this.brandingService.assetForSlot(validSlot);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(buffer);
  }
}

function parseSlot(slot: string): OrbitBrandingAssetSlot {
  const match = VALID_SLOTS.find((candidate) => candidate === slot);
  if (!match) {
    throw new BadRequestException(`Unknown branding slot: ${slot}`);
  }
  return match;
}
