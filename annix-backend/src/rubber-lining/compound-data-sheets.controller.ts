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
import { FeatureLicenseGuard, RequireFeature } from "../licensing";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  CompoundDataSheetsService,
  CreateCompoundDataSheetDto,
  UpdateCompoundDataSheetDto,
} from "./compound-data-sheets.service";
import { AU_RUBBER_FEATURES, AU_RUBBER_MODULE_KEY } from "./config/au-rubber-licensing";
import { CompoundDataSheet } from "./entities/compound-data-sheet.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";

@ApiTags("AU Rubber Compound Data Sheets")
@Controller("rubber-lining/data-sheets")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard, FeatureLicenseGuard)
@RequireFeature(AU_RUBBER_MODULE_KEY, AU_RUBBER_FEATURES.WEBSITE_CMS)
@ApiBearerAuth()
export class CompoundDataSheetsController {
  constructor(
    private readonly dataSheetsService: CompoundDataSheetsService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all compound data sheets (admin)" })
  @ApiResponse({ status: 200, type: [CompoundDataSheet] })
  async sheets(): Promise<CompoundDataSheet[]> {
    return this.dataSheetsService.allSheets();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get compound data sheet by ID (admin)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: CompoundDataSheet })
  async sheet(@Param("id", ParseUUIDPipe) id: string): Promise<CompoundDataSheet> {
    return this.dataSheetsService.sheetById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new compound data sheet" })
  @ApiResponse({ status: 201, type: CompoundDataSheet })
  async createSheet(@Body() dto: CreateCompoundDataSheetDto): Promise<CompoundDataSheet> {
    return this.dataSheetsService.createSheet(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a compound data sheet" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: CompoundDataSheet })
  async updateSheet(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompoundDataSheetDto,
  ): Promise<CompoundDataSheet> {
    return this.dataSheetsService.updateSheet(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a compound data sheet" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200 })
  async deleteSheet(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.dataSheetsService.deleteSheet(id);
  }

  @Post("upload-pdf")
  @ApiOperation({ summary: "Upload a technical data sheet PDF" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new Error("No file uploaded");
    }
    const result = await this.storageService.upload(
      file,
      `au-industries/data-sheets/${file.originalname}`,
    );
    return { url: result.url };
  }
}
