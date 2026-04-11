import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { PhotoIdentificationService } from "../services/photo-identification.service";

interface IdentifyByBase64Body {
  imageBase64: string;
  mimeType: string;
}

@ApiTags("stock-management/photo-identification")
@Controller("stock-management/issuance")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class PhotoIdentificationController {
  constructor(private readonly service: PhotoIdentificationService) {}

  @Post("identify-photo")
  @StockManagementFeature("PHOTO_IDENTIFICATION")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Identify a stock item from a photo (paint tin, rubber roll tag, consumable label, etc.)",
  })
  async identifyByFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const base64 = file.buffer.toString("base64");
    return this.service.identify(Number(req.user.companyId), base64, file.mimetype);
  }

  @Post("identify-photo-base64")
  @StockManagementFeature("PHOTO_IDENTIFICATION")
  @ApiOperation({
    summary: "Identify a stock item from a base64-encoded photo (alternative to multipart upload)",
  })
  async identifyByBase64(@Req() req: any, @Body() body: IdentifyByBase64Body) {
    return this.service.identify(Number(req.user.companyId), body.imageBase64, body.mimeType);
  }
}
