import { Body, Controller, Get, Logger, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminCompanyProfileService } from "../admin/admin-company-profile.service";
import { CompanyProfile } from "../admin/entities/company-profile.entity";
import { EmailService } from "../email/email.service";
import { ApiMessageResponse, messageResponse } from "../shared/dto";
import { Testimonial } from "./entities/testimonial.entity";
import { WebsitePage } from "./entities/website-page.entity";
import { TestimonialsService } from "./testimonials.service";
import { WebsitePagesService } from "./website-pages.service";

interface ContactFormDto {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

@ApiTags("Public AU Industries")
@Controller("public/au-industries")
export class PublicAuIndustriesController {
  private readonly logger = new Logger(PublicAuIndustriesController.name);

  constructor(
    private readonly websitePagesService: WebsitePagesService,
    private readonly testimonialsService: TestimonialsService,
    private readonly companyProfileService: AdminCompanyProfileService,
    private readonly emailService: EmailService,
  ) {}

  @Get("pages")
  @ApiOperation({ summary: "List published website pages (for navigation)" })
  @ApiResponse({ status: 200, type: [WebsitePage] })
  async publishedPages(): Promise<WebsitePage[]> {
    return this.websitePagesService.publishedPages();
  }

  @Get("pages/:slug")
  @ApiOperation({ summary: "Get a published page by slug" })
  @ApiParam({ name: "slug", type: "string" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async pageBySlug(@Param("slug") slug: string): Promise<WebsitePage> {
    return this.websitePagesService.publishedPageBySlug(slug);
  }

  @Get("home")
  @ApiOperation({ summary: "Get the home page" })
  @ApiResponse({ status: 200, type: WebsitePage })
  async homePage(): Promise<WebsitePage | null> {
    return this.websitePagesService.homePage();
  }

  @Get("testimonials")
  @ApiOperation({ summary: "List published customer testimonials" })
  @ApiResponse({ status: 200, type: [Testimonial] })
  async publishedTestimonials(): Promise<Testimonial[]> {
    return this.testimonialsService.publishedTestimonials();
  }

  @Get("contact")
  @ApiOperation({ summary: "Get company contact details for the website" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async contactDetails(): Promise<CompanyProfile> {
    return this.companyProfileService.profile();
  }

  @Post("contact")
  @ApiOperation({ summary: "Submit contact form" })
  @ApiResponse({ status: 201 })
  async submitContactForm(@Body() dto: ContactFormDto): Promise<ApiMessageResponse> {
    const profile = await this.companyProfileService.profile();
    const recipientEmail = profile.generalEmail || "info@example.com";

    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${this.escapeHtml(dto.name)}</p>
      <p><strong>Email:</strong> ${this.escapeHtml(dto.email)}</p>
      ${dto.phone ? `<p><strong>Phone:</strong> ${this.escapeHtml(dto.phone)}</p>` : ""}
      <hr />
      <p>${this.escapeHtml(dto.message).replace(/\n/g, "<br />")}</p>
    `;

    await this.emailService.sendEmail({
      to: recipientEmail,
      subject: `[AU Industries Website] Contact from ${dto.name}`,
      html,
      replyTo: dto.email,
    });

    this.logger.log(`Contact form submitted by ${dto.name} (${dto.email})`);
    return messageResponse("Your message has been sent successfully");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
