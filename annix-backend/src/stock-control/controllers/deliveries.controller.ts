import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateDeliveryNoteDto } from "../dto/create-delivery-note.dto";
import { RubberCocExtractionService } from "../../rubber-lining/rubber-coc-extraction.service";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import { DeliveryService } from "../services/delivery.service";

@ApiTags("Stock Control - Deliveries")
@Controller("stock-control/deliveries")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class DeliveriesController {
  private readonly logger = new Logger(DeliveriesController.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly extractionService: RubberCocExtractionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all delivery notes" })
  async list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.deliveryService.findAll(req.user.companyId, pageNum, limitNum);
  }

  @Get(":id")
  @ApiOperation({ summary: "Delivery note by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.findById(req.user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a delivery note with items" })
  async create(@Body() dto: CreateDeliveryNoteDto, @Req() req: any) {
    return this.deliveryService.create(req.user.companyId, {
      ...dto,
      receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
      receivedBy: req.user.name,
    });
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("deliveries.delete")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a delivery note" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.remove(req.user.companyId, id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for a delivery note" })
  async uploadPhoto(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.deliveryService.uploadPhoto(req.user.companyId, id, file);
  }

  @Post(":id/extract")
  @ApiOperation({ summary: "Extract data from delivery note photo using AI" })
  async extractFromPhoto(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.extractFromPhoto(req.user.companyId, id);
  }

  @Get(":id/extraction")
  @ApiOperation({ summary: "Get extraction status for delivery note" })
  async extractionStatus(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.extractionStatus(req.user.companyId, id);
  }

  @Post(":id/link-to-stock")
  @ApiOperation({ summary: "Create stock items from extracted delivery note data" })
  async linkExtractedToStock(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.linkExtractedItemsToStock(req.user.companyId, id, req.user.name);
  }

  @Post("analyze")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Analyze a delivery note photo or PDF to extract data" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Image (JPEG, PNG) or PDF file of the delivery note",
        },
      },
    },
  })
  async analyzeDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const isPdf = file.mimetype === "application/pdf";
    const isImage = file.mimetype.startsWith("image/");

    if (!isPdf && !isImage) {
      throw new BadRequestException("File must be an image (JPEG, PNG) or PDF");
    }

    if (isPdf) {
      return this.extractionService.analyzeDeliveryNotePdf(file.buffer);
    }

    return this.extractionService.analyzeDeliveryNotePhoto([file.buffer]);
  }

  @Post("accept-analyzed")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Accept analyzed delivery note and create record" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Original photo (JPEG, PNG) or PDF of delivery note",
        },
        analyzedData: {
          type: "string",
          description: "JSON string of analyzed delivery note data",
        },
      },
    },
  })
  async acceptAnalyzedDeliveryNote(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body("analyzedData") analyzedDataJson: string,
    @Body("documentType") documentType?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!analyzedDataJson) {
      throw new BadRequestException("No analyzed data provided");
    }

    try {
      const analyzedData = JSON.parse(analyzedDataJson) as {
        deliveryNoteNumber?: string;
        invoiceNumber?: string;
        deliveryDate?: string;
        fromCompany?: { name?: string };
        toCompany?: { name?: string };
        totals?: {
          subtotalExclVat?: number;
          vatTotal?: number;
          grandTotalInclVat?: number;
        };
        lineItems?: Array<{
          description?: string;
          itemCode?: string;
          productCode?: string;
          quantity?: number;
          unitOfMeasure?: string;
          unitPrice?: number;
          lineTotal?: number;
          isReturned?: boolean;
          isPaint?: boolean;
          isTwoPack?: boolean;
          volumeLitersPerPack?: number;
          totalLiters?: number;
          costPerLiter?: number;
        }>;
      };

      if (documentType === "SUPPLIER_INVOICE") {
        this.logger.log(`Creating invoice for company ${req.user.companyId} from analyzed data`);

        const invoice = await this.deliveryService.createInvoiceFromAnalyzedData(
          req.user.companyId,
          file,
          analyzedData,
        );

        return invoice;
      }

      this.logger.log(
        `Creating delivery note for company ${req.user.companyId} from analyzed data`,
      );

      const deliveryNote = await this.deliveryService.createFromAnalyzedData(
        req.user.companyId,
        file,
        analyzedData,
        req.user.name,
      );

      return deliveryNote;
    } catch (error) {
      this.logger.error(
        `Failed to create record: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create record: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
