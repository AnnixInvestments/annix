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
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { WebsitePage } from "./entities/website-page.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import {
  CreateWebsitePageDto,
  UpdateWebsitePageDto,
  WebsitePagesService,
} from "./website-pages.service";

@ApiTags("AU Rubber Website Pages")
@Controller("rubber-lining/website-pages")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard)
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
