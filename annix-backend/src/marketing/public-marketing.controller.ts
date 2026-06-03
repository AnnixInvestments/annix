import type { MarketingSiteContent as MarketingSiteContentTree } from "@annix/product-data/marketing";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Logger,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AdminCompanyProfileService } from "../admin/admin-company-profile.service";
import { EmailService } from "../email/email.service";
import { ApiMessageResponse, messageResponse } from "../shared/dto";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { MarketingSiteContentService } from "./marketing-site-content.service";

function mimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

interface MarketingContactDto {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

@ApiTags("Public Marketing")
@Controller("public/marketing")
export class PublicMarketingController {
  private readonly logger = new Logger(PublicMarketingController.name);

  constructor(
    private readonly marketingService: MarketingSiteContentService,
    private readonly companyProfileService: AdminCompanyProfileService,
    private readonly emailService: EmailService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get("asset")
  @ApiOperation({ summary: "Stream an uploaded marketing image by its storage key" })
  async asset(@Query("key") key: string, @Res() res: Response): Promise<void> {
    if (!key?.startsWith("annix-marketing/")) {
      throw new BadRequestException("Invalid asset key");
    }
    const buffer = await this.storageService.download(key);
    res.setHeader("Content-Type", mimeFromKey(key));
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(buffer);
  }

  @Get("content")
  @Header("Cache-Control", "public, max-age=60")
  @ApiOperation({ summary: "Get the published marketing site content" })
  @ApiResponse({ status: 200 })
  async content(): Promise<MarketingSiteContentTree> {
    return this.marketingService.publishedContent();
  }

  @Post("contact")
  @ApiOperation({ summary: "Submit the marketing contact / book-a-demo form" })
  @ApiResponse({ status: 201 })
  async submitContact(@Body() dto: MarketingContactDto): Promise<ApiMessageResponse> {
    const profile = await this.companyProfileService.profile();
    const recipientEmail = profile.demoRequestEmail || profile.generalEmail || "info@example.com";

    const html = `
      <h2>New Annix Website Enquiry</h2>
      <p><strong>From:</strong> ${this.escapeHtml(dto.name)}</p>
      <p><strong>Email:</strong> ${this.escapeHtml(dto.email)}</p>
      ${dto.company ? `<p><strong>Company:</strong> ${this.escapeHtml(dto.company)}</p>` : ""}
      ${dto.phone ? `<p><strong>Phone:</strong> ${this.escapeHtml(dto.phone)}</p>` : ""}
      <hr />
      <p>${this.escapeHtml(dto.message).replace(/\n/g, "<br />")}</p>
    `;

    await this.emailService.sendEmail({
      to: recipientEmail,
      subject: `[Annix Website] Enquiry from ${dto.name}`,
      html,
      replyTo: dto.email,
    });

    this.logger.log(`Marketing enquiry submitted by ${dto.name} (${dto.email})`);
    return messageResponse("Thanks — your enquiry has been sent. We will be in touch shortly.");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
