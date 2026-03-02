import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PublicBrandingService } from "../services/public-branding.service";

@ApiTags("Stock Control - Public Branding")
@Controller("stock-control/branding")
export class PublicBrandingController {
  constructor(private readonly publicBrandingService: PublicBrandingService) {}

  @Get(":companyId")
  @ApiOperation({ summary: "Public branding info for a company (no auth required)" })
  async publicBranding(@Param("companyId") companyId: string, @Res() res: Response): Promise<void> {
    const parsedId = parseInt(companyId, 10);

    if (Number.isNaN(parsedId)) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid company ID" });
      return;
    }

    const branding = await this.publicBrandingService.publicBrandingInfo(parsedId);

    if (!branding) {
      res.status(HttpStatus.NOT_FOUND).json({ message: "Company not found" });
      return;
    }

    res.json(branding);
  }

  @Get(":companyId/icon/:size")
  @ApiOperation({ summary: "Dynamic PWA icon for a company (no auth required)" })
  async brandingIcon(
    @Param("companyId") companyId: string,
    @Param("size") size: string,
    @Res() res: Response,
  ): Promise<void> {
    const parsedId = parseInt(companyId, 10);
    const parsedSize = parseInt(size, 10);

    if (Number.isNaN(parsedId)) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid company ID" });
      return;
    }

    if (parsedSize !== 192 && parsedSize !== 512) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "Size must be 192 or 512" });
      return;
    }

    const iconBuffer = await this.publicBrandingService.brandingIcon(
      parsedId,
      parsedSize as 192 | 512,
    );

    if (!iconBuffer) {
      res.status(HttpStatus.NOT_FOUND).json({ message: "Icon not available" });
      return;
    }

    res.set({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "Content-Length": iconBuffer.length.toString(),
    });
    res.send(iconBuffer);
  }
}
