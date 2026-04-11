import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type {
  ProductDatasheetDocType,
  ProductDatasheetType,
} from "../entities/product-datasheet.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { ProductDatasheetService } from "../services/product-datasheet.service";

interface UploadBody {
  productType: ProductDatasheetType;
  paintProductId?: number;
  rubberCompoundId?: number;
  solutionProductId?: number;
  consumableProductId?: number;
  docType?: ProductDatasheetDocType;
  notes?: string;
}

@ApiTags("stock-management/datasheets")
@Controller("stock-management/datasheets")
@UseGuards(JwtAuthGuard, StockManagementFeatureGuard)
export class ProductDatasheetController {
  constructor(private readonly datasheetService: ProductDatasheetService) {}

  @Get()
  @StockManagementFeature("PRODUCT_DATASHEETS")
  @ApiOperation({ summary: "List active datasheets for the calling company" })
  async list(@Req() req: any, @Query("productType") productType?: ProductDatasheetType) {
    return this.datasheetService.list(Number(req.user.companyId), productType);
  }

  @Get(":id")
  @StockManagementFeature("PRODUCT_DATASHEETS")
  @ApiOperation({ summary: "Get a single datasheet by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.datasheetService.byId(Number(req.user.companyId), id);
  }

  @Get(":id/download-url")
  @StockManagementFeature("PRODUCT_DATASHEETS")
  @ApiOperation({ summary: "Get a presigned download URL for a datasheet file" })
  async downloadUrl(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const url = await this.datasheetService.presignedUrl(Number(req.user.companyId), id);
    return { url };
  }

  @Post("upload")
  @StockManagementFeature("PRODUCT_DATASHEETS")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload a new datasheet (PDF or image) for a paint, rubber compound, or solution",
  })
  async upload(
    @Req() req: any,
    @Body() body: UploadBody,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.datasheetService.upload(Number(req.user.companyId), {
      productType: body.productType,
      paintProductId: body.paintProductId ? Number(body.paintProductId) : null,
      rubberCompoundId: body.rubberCompoundId ? Number(body.rubberCompoundId) : null,
      solutionProductId: body.solutionProductId ? Number(body.solutionProductId) : null,
      consumableProductId: body.consumableProductId ? Number(body.consumableProductId) : null,
      docType: body.docType,
      file,
      uploadedById: req.user.id ?? null,
      uploadedByName: req.user.name ?? null,
      notes: body.notes ?? null,
    });
  }

  @Post(":id/verify")
  @StockManagementFeature("PRODUCT_DATASHEETS")
  @ApiOperation({ summary: "Manually verify a datasheet's extracted data as accurate" })
  async verify(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.datasheetService.verify(Number(req.user.companyId), id);
  }
}
