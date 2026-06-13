import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { FeatureLicenseGuard, RequireFeature } from "../licensing";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { AU_RUBBER_FEATURES, AU_RUBBER_MODULE_KEY } from "./config/au-rubber-licensing";
import { WebsitePage } from "./entities/website-page.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import {
  CreateWebsitePageDto,
  UpdateWebsitePageDto,
  WebsitePagesService,
} from "./website-pages.service";

interface AuthenticatedRequest {
  user?: { email?: string };
}

@ApiTags("AU Rubber Website Pages")
@Controller("rubber-lining/website-pages")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard, FeatureLicenseGuard)
@RequireFeature(AU_RUBBER_MODULE_KEY, AU_RUBBER_FEATURES.WEBSITE_CMS)
@ApiBearerAuth()
export class WebsitePagesController {
  constructor(
    private readonly websitePagesService: WebsitePagesService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all website pages (admin)" })
  @ApiResponse({ status: 200, type: [WebsitePage] })
  async pages(): Promise<WebsitePage[]> {
    return this.websitePagesService.allPages();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get website page by ID (admin)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async page(@Param("id", ParseUUIDPipe) id: string): Promise<WebsitePage> {
    return this.websitePagesService.pageById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new website page" })
  @ApiResponse({ status: 201, type: WebsitePage })
  async createPage(@Body() dto: CreateWebsitePageDto): Promise<WebsitePage> {
    return this.websitePagesService.createPage(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a website page" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async updatePage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebsitePageDto,
  ): Promise<WebsitePage> {
    return this.websitePagesService.updatePage(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a website page" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200 })
  async deletePage(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.websitePagesService.deletePage(id);
  }

  @Patch(":id/reorder")
  @ApiOperation({ summary: "Change page sort order" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async reorderPage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { sortOrder: number },
  ): Promise<WebsitePage> {
    return this.websitePagesService.reorderPage(id, body.sortOrder);
  }

  @Put(":id/blocks/draft")
  @ApiOperation({ summary: "Save the block draft for a page" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async saveDraftBlocks(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { blocks: Record<string, unknown>[] },
  ): Promise<WebsitePage> {
    return this.websitePagesService.saveDraftBlocks(id, body.blocks ?? []);
  }

  @Post(":id/blocks/publish")
  @ApiOperation({ summary: "Publish the block draft to the live page" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async publishBlocks(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WebsitePage> {
    const publishedBy = req.user?.email ?? null;
    return this.websitePagesService.publishBlocks(id, publishedBy);
  }

  @Post(":id/blocks/discard")
  @ApiOperation({ summary: "Discard the block draft, reverting to the published blocks" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async discardDraftBlocks(@Param("id", ParseUUIDPipe) id: string): Promise<WebsitePage> {
    return this.websitePagesService.discardDraftBlocks(id);
  }

  @Post("upload-image")
  @ApiOperation({ summary: "Upload an image for website pages" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new Error("No file uploaded");
    }

    const result = await this.storageService.upload(
      file,
      `au-industries/images/${file.originalname}`,
    );

    return { url: result.url };
  }
}
