import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import {
  AppBrandingService,
  type BrandingAdminView,
  type BrandingAssetSlot,
  type BrandingImageView,
  type BrandingView,
} from "./app-branding.service";
import { UpdateBrandingDto } from "./dto/update-branding.dto";

const ALLOWED_ASSET_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

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

@ApiTags("Admin Branding")
@Controller("admin/branding")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminBrandingController {
  constructor(private readonly brandingService: AppBrandingService) {}

  @Get(":brand")
  @ApiOperation({ summary: "Retrieve a brand's branding (own + master + effective)" })
  async branding(@Param("brand") brand: string): Promise<BrandingAdminView> {
    return this.brandingService.adminBranding(brand);
  }

  @Patch(":brand")
  @ApiOperation({ summary: "Update (publish) a brand's branding" })
  async update(
    @Param("brand") brand: string,
    @Body() dto: UpdateBrandingDto,
  ): Promise<BrandingView> {
    return this.brandingService.updateBranding(brand, dto);
  }

  @Post(":brand/:slot/upload")
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
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAsset(
    @Param("brand") brand: string,
    @Param("slot") slot: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ slot: BrandingAssetSlot; path: string; previewUrl: string }> {
    const validSlot = parseSlot(slot);
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    const result = await this.brandingService.uploadAsset(brand, file);
    return { slot: validSlot, path: result.path, previewUrl: result.previewUrl };
  }

  @Get(":brand/images")
  @ApiOperation({ summary: "List a brand's additional gallery images" })
  async images(@Param("brand") brand: string): Promise<BrandingImageView[]> {
    return this.brandingService.listImages(brand);
  }

  @Post(":brand/images")
  @ApiOperation({ summary: "Add a brand gallery image" })
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
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async addImage(
    @Param("brand") brand: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("label") label?: string,
  ): Promise<BrandingImageView> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.brandingService.addImage(brand, label ?? "", file);
  }

  @Delete(":brand/images/:id")
  @ApiOperation({ summary: "Delete a brand gallery image" })
  async deleteImage(
    @Param("brand") brand: string,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    await this.brandingService.deleteImage(brand, id);
    return { success: true };
  }
}

function parseSlot(slot: string): BrandingAssetSlot {
  const match = VALID_SLOTS.find((candidate) => candidate === slot);
  if (!match) {
    throw new BadRequestException(`Unknown branding slot: ${slot}`);
  }
  return match;
}
