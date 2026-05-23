import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { UpdateOrbitBrandingDto } from "../dto/branding.dto";
import {
  type OrbitBrandingAssetSlot,
  OrbitBrandingService,
  type OrbitBrandingView,
} from "../services/orbit-branding.service";

const ALLOWED_ASSET_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const VALID_SLOTS: OrbitBrandingAssetSlot[] = ["logoIcon", "wordmark", "favicon", "watermark"];

@ApiTags("Admin Annix Orbit Branding")
@Controller("admin/annix-orbit/branding")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminOrbitBrandingController {
  constructor(private readonly brandingService: OrbitBrandingService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve Annix Orbit branding" })
  async branding(): Promise<OrbitBrandingView> {
    return this.brandingService.branding();
  }

  @Patch()
  @ApiOperation({ summary: "Update (publish) Annix Orbit branding" })
  async update(@Body() dto: UpdateOrbitBrandingDto): Promise<OrbitBrandingView> {
    return this.brandingService.updateBranding(dto);
  }

  @Post(":slot/upload")
  @ApiOperation({ summary: "Upload a branding asset (returns a preview URL; publish via PATCH)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_ASSET_MIME.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only image files are allowed"), false);
        }
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAsset(
    @Param("slot") slot: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ slot: OrbitBrandingAssetSlot; path: string; previewUrl: string }> {
    const validSlot = parseSlot(slot);
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    const result = await this.brandingService.uploadAsset(file);
    return { slot: validSlot, path: result.path, previewUrl: result.previewUrl };
  }
}

function parseSlot(slot: string): OrbitBrandingAssetSlot {
  const match = VALID_SLOTS.find((candidate) => candidate === slot);
  if (!match) {
    throw new BadRequestException(`Unknown branding slot: ${slot}`);
  }
  return match;
}
