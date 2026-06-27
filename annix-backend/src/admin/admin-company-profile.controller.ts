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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminCompanyProfileService, type CompanyAssetKind } from "./admin-company-profile.service";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { CompanyProfile } from "./entities/company-profile.entity";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif)$/;
const imageUpload = FileInterceptor("file", {
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files (PNG, JPG, WEBP) are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ASSET_KINDS: Record<string, CompanyAssetKind> = {
  letterhead: "letterhead",
  "email-signature": "emailSignature",
};

@ApiTags("Admin Company Profile")
@Controller("admin/company-profile")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminCompanyProfileController {
  constructor(private readonly companyProfileService: AdminCompanyProfileService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve company profile" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async profile(): Promise<CompanyProfile> {
    return this.companyProfileService.profile();
  }

  @Patch()
  @ApiOperation({ summary: "Update company profile" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async updateProfile(@Body() dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    return this.companyProfileService.updateProfile(dto);
  }

  @Get("asset-urls")
  @ApiOperation({ summary: "Preview URLs for the uploaded letterhead + email signature" })
  async assetUrls(): Promise<{ letterheadUrl: string | null; emailSignatureUrl: string | null }> {
    return this.companyProfileService.assetUrls();
  }

  // kind = "letterhead" | "email-signature"
  @Post("assets/:kind")
  @UseInterceptors(imageUpload)
  @ApiOperation({ summary: "Upload a company branding image (letterhead or email signature)" })
  async uploadAsset(
    @Param("kind") kind: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CompanyProfile> {
    const assetKind = ASSET_KINDS[kind];
    if (!assetKind) throw new BadRequestException("Unknown asset kind");
    if (!file) throw new BadRequestException("No file uploaded");
    return this.companyProfileService.uploadAsset(assetKind, file);
  }

  @Delete("assets/:kind")
  @ApiOperation({ summary: "Remove a company branding image" })
  async removeAsset(@Param("kind") kind: string): Promise<CompanyProfile> {
    const assetKind = ASSET_KINDS[kind];
    if (!assetKind) throw new BadRequestException("Unknown asset kind");
    return this.companyProfileService.removeAsset(assetKind);
  }
}
