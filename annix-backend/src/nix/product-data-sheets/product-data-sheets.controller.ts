import * as fs from "node:fs";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
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
import { AnyUserAuthGuard, AuthenticatedUser } from "../../auth/guards/any-user-auth.guard";
import { ProductDataSheet, ProductDataSheetKind } from "../entities/product-data-sheet.entity";
import { UploadProductDataSheetResponseDto } from "./dto/product-data-sheet.dto";
import { ExtractionFailedError, ProductDataSheetsService } from "./product-data-sheets.service";

@ApiTags("Nix Product Data Sheet Library")
@Controller("nix/product-data-sheets")
export class ProductDataSheetsController {
  constructor(private readonly service: ProductDataSheetsService) {}

  @Post("upload")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Upload a product data sheet (PDF / image) to the shared library. Gemini extracts manufacturer + product + revision; the row is auto-registered, or matched against an existing version if it's already in the library.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        kind: { type: "string", enum: ["coating", "lining"] },
      },
      required: ["file", "kind"],
    },
  })
  @ApiResponse({ status: 201, type: UploadProductDataSheetResponseDto })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<UploadProductDataSheetResponseDto> {
    const authUser = req["authUser"] as AuthenticatedUser;
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    if (!file.path) {
      throw new BadRequestException("Upload missing disk path");
    }

    const rawKind = typeof body.kind === "string" ? body.kind : undefined;
    if (rawKind !== ProductDataSheetKind.COATING && rawKind !== ProductDataSheetKind.LINING) {
      throw new BadRequestException(
        `kind must be 'coating' or 'lining'; received ${JSON.stringify(rawKind)}`,
      );
    }

    const buffer = fs.readFileSync(file.path);

    try {
      const result = await this.service.uploadFromBuffer({
        fileBuffer: buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        kind: rawKind,
        userId: authUser?.userId,
      });
      return toResponseDto(result.row, result.outcome, result.supersededFromRevision, {
        brand: result.extracted.brand,
        description: result.extracted.description,
      });
    } catch (error) {
      if (error instanceof ExtractionFailedError) {
        // 422 would be more correct, but the editor distinguishes by message
        // content; the failure caption already handles a thrown error. We
        // include the partial extraction in the response so the quoter sees
        // exactly what Gemini saw before giving up.
        const e = error.extracted;
        const m = e.manufacturer ? `'${e.manufacturer}'` : "(blank)";
        const p = e.productName ? `'${e.productName}'` : "(blank)";
        throw new BadRequestException(
          `Auto-fill failed — Gemini read manufacturer=${m}, productName=${p}. Type the missing details manually.`,
        );
      }
      throw error;
    } finally {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore — multer cleans up after the request anyway
      }
    }
  }

  @Get(":id/url")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Presigned S3 URL for viewing a data sheet (10 min expiry).",
  })
  async presignedUrl(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const url = await this.service.presignedUrl(id);
    if (!url) {
      throw new NotFoundException("Data sheet not found");
    }
    return { url, expiresInSeconds: 600 };
  }

  @Get(":manufacturerSlug/:productSlug/versions")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Full version history for a (manufacturer, product) pair — current row first, then superseded versions newest-to-oldest. Powers the archive view.",
  })
  async listVersions(
    @Param("manufacturerSlug") manufacturerSlug: string,
    @Param("productSlug") productSlug: string,
  ): Promise<UploadProductDataSheetResponseDto[]> {
    const rows = await this.service.listVersions(manufacturerSlug, productSlug);
    return rows.map((row) =>
      toResponseDto(row, row.isLatest ? "new" : "superseded", null, {
        brand: row.extractedBrand ?? null,
        description: row.extractedDescription ?? null,
      }),
    );
  }
}

function toResponseDto(
  row: ProductDataSheet,
  outcome: "new" | "reused" | "superseded",
  supersededFromRevision: string | null,
  extracted: { brand: string | null; description: string | null },
): UploadProductDataSheetResponseDto {
  return {
    dataSheetId: row.id,
    manufacturer: row.manufacturer,
    productName: row.productName,
    kind: row.kind,
    version: row.version,
    publishedRevision: row.publishedRevision ?? null,
    publishedDate: row.publishedDate ?? null,
    brand: extracted.brand ?? row.extractedBrand ?? null,
    description: extracted.description ?? row.extractedDescription ?? null,
    outcome,
    supersededFromRevision,
  };
}
