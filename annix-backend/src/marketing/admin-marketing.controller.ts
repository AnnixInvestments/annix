import type { MarketingSiteContent as MarketingSiteContentTree } from "@annix/product-data/marketing";
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { MarketingSiteContentService } from "./marketing-site-content.service";

interface AuthenticatedRequest {
  user?: { email?: string };
}

@ApiTags("Admin Marketing")
@Controller("admin/marketing")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminMarketingController {
  constructor(
    private readonly marketingService: MarketingSiteContentService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get("content")
  @ApiOperation({ summary: "Get the editable draft marketing content" })
  @ApiResponse({ status: 200 })
  async draft(): Promise<MarketingSiteContentTree> {
    return this.marketingService.draftContent();
  }

  @Get("status")
  @ApiOperation({ summary: "Get draft / published status" })
  @ApiResponse({ status: 200 })
  async status() {
    return this.marketingService.status();
  }

  @Put("content")
  @ApiOperation({ summary: "Save the draft marketing content" })
  @ApiResponse({ status: 200 })
  async saveDraft(@Body() content: MarketingSiteContentTree): Promise<MarketingSiteContentTree> {
    return this.marketingService.saveDraft(content);
  }

  @Post("publish")
  @ApiOperation({ summary: "Publish the draft to the live site" })
  @ApiResponse({ status: 200 })
  async publish(@Req() req: AuthenticatedRequest): Promise<MarketingSiteContentTree> {
    const publishedBy = req.user?.email ?? null;
    return this.marketingService.publish(publishedBy);
  }

  @Post("discard-draft")
  @ApiOperation({ summary: "Discard the draft, reverting it to the live content" })
  @ApiResponse({ status: 200 })
  async discardDraft(): Promise<MarketingSiteContentTree> {
    return this.marketingService.discardDraft();
  }

  @Post("upload-image")
  @ApiOperation({ summary: "Upload an image for the marketing site" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new Error("No file uploaded");
    }
    const result = await this.storageService.upload(
      file,
      `${StorageArea.ANNIX_MARKETING}/images/${file.originalname}`,
    );
    return { url: result.url };
  }
}
