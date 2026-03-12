import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ProcessBrandingSelectionDto } from "../dto/process-branding-selection.dto";
import { SetBrandingDto } from "../dto/set-branding.dto";
import { UpdateCompanyDetailsDto } from "../dto/update-company-details.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { StockControlAuthService } from "../services/auth.service";
import { BrandingScraperService } from "../services/branding-scraper.service";
import { CompanyEmailService, SmtpConfigDto } from "../services/company-email.service";
import { CompanyRoleService } from "../services/company-role.service";
import { LookupService } from "../services/lookup.service";
import { RbacConfigService } from "../services/rbac-config.service";

@ApiTags("Stock Control - Auth")
@Controller("stock-control/auth")
export class StockControlAuthController {
  constructor(
    private readonly authService: StockControlAuthService,
    private readonly brandingScraperService: BrandingScraperService,
    private readonly companyEmailService: CompanyEmailService,
    private readonly lookupService: LookupService,
    private readonly rbacConfigService: RbacConfigService,
    private readonly companyRoleService: CompanyRoleService,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new stock control user" })
  async register(
    @Body() body: {
      email: string;
      password: string;
      name: string;
      companyName?: string;
      invitationToken?: string;
    },
  ) {
    return this.authService.register(
      body.email,
      body.password,
      body.name,
      body.companyName,
      body.invitationToken,
    );
  }

  @Get("verify-email")
  @ApiOperation({ summary: "Verify email address" })
  async verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: "Resend verification email" })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Request password reset" })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset password with token" })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post("login")
  @ApiOperation({ summary: "Login to stock control" })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("scrape-branding")
  @ApiOperation({ summary: "Scrape branding candidates from a website" })
  async scrapeBranding(@Body() body: { websiteUrl: string }) {
    return this.brandingScraperService.scrapeCandidates(body.websiteUrl);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("process-branding-selection")
  @ApiOperation({ summary: "Process and store selected branding images" })
  async processBrandingSelection(@Req() req: any, @Body() body: ProcessBrandingSelectionDto) {
    return this.brandingScraperService.processAndStoreSelected(
      req.user.companyId,
      body.logoSourceUrl ?? null,
      body.heroSourceUrl ?? null,
      body.scrapedPrimaryColor ?? null,
    );
  }

  @UseGuards(StockControlAuthGuard)
  @Get("proxy-image")
  @ApiOperation({ summary: "Proxy an external image to avoid CORS issues" })
  async proxyImage(@Query("url") url: string, @Res() res: Response) {
    if (!url) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "url query parameter is required" });
      return;
    }

    const result = await this.brandingScraperService.proxyImage(url);
    if (!result) {
      res.status(HttpStatus.BAD_GATEWAY).json({ message: "Failed to fetch image" });
      return;
    }

    res.set({
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=300",
      "Content-Length": result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("set-branding")
  @ApiOperation({ summary: "Set branding preference for company" })
  async setBranding(@Req() req: any, @Body() body: SetBrandingDto) {
    return this.authService.setBranding(
      req.user.companyId,
      body.brandingType,
      body.websiteUrl,
      body.brandingAuthorized,
      body.primaryColor,
      body.accentColor,
      body.logoUrl,
      body.heroImageUrl,
    );
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("company-details")
  @ApiOperation({ summary: "Update company details" })
  async updateCompanyDetails(@Req() req: any, @Body() body: UpdateCompanyDetailsDto) {
    return this.authService.updateCompanyDetails(req.user.companyId, body);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("company-name")
  @ApiOperation({ summary: "Update company name (legacy)" })
  async updateCompanyName(@Req() req: any, @Body() body: { name: string }) {
    return this.authService.updateCompanyDetails(req.user.companyId, { name: body.name });
  }

  @UseGuards(StockControlAuthGuard)
  @Get("me")
  @ApiOperation({ summary: "Current user profile" })
  async currentUser(@Req() req: any) {
    return this.authService.currentUser(req.user.id);
  }

  @UseGuards(StockControlAuthGuard)
  @Patch("me/linked-staff")
  @ApiOperation({ summary: "Link or unlink a staff member to the current user" })
  async updateLinkedStaff(@Req() req: any, @Body() body: { linkedStaffId: number | null }) {
    return this.authService.updateLinkedStaff(req.user.id, req.user.companyId, body.linkedStaffId);
  }

  @UseGuards(StockControlAuthGuard)
  @Patch("me/tooltip-preference")
  @ApiOperation({ summary: "Update tooltip visibility preference" })
  async updateTooltipPreference(@Req() req: any, @Body() body: { hideTooltips: boolean }) {
    return this.authService.updateTooltipPreference(req.user.id, body.hideTooltips);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Get("team")
  @ApiOperation({ summary: "List team members" })
  async teamMembers(@Req() req: any) {
    return this.authService.teamMembers(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("team/:id/role")
  @ApiOperation({ summary: "Update team member role" })
  async updateMemberRole(@Req() req: any, @Param("id") id: number, @Body() body: { role: string }) {
    return this.authService.updateMemberRole(req.user.companyId, id, body.role as any);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("team/:id/send-app-link")
  @ApiOperation({ summary: "Send app link email to team member" })
  async sendAppLink(@Req() req: any, @Param("id") id: number) {
    return this.authService.sendAppLink(req.user.companyId, id);
  }

  @UseGuards(StockControlAuthGuard)
  @Post("logout")
  @ApiOperation({ summary: "Logout" })
  async logout() {
    return { message: "Logged out" };
  }

  @UseGuards(StockControlAuthGuard)
  @Get("departments")
  @ApiOperation({ summary: "List departments for company" })
  async departments(@Req() req: any) {
    return this.lookupService.departmentsByCompany(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("departments")
  @ApiOperation({ summary: "Create a department" })
  async createDepartment(@Req() req: any, @Body() body: { name: string; displayOrder?: number }) {
    return this.lookupService.createDepartment(req.user.companyId, body.name, body.displayOrder);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Put("departments/:id")
  @ApiOperation({ summary: "Update a department" })
  async updateDepartment(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { name?: string; displayOrder?: number | null; active?: boolean },
  ) {
    return this.lookupService.updateDepartment(req.user.companyId, id, body);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete("departments/:id")
  @ApiOperation({ summary: "Soft delete a department" })
  async deleteDepartment(@Req() req: any, @Param("id") id: number) {
    return this.lookupService.deleteDepartment(req.user.companyId, id);
  }

  @UseGuards(StockControlAuthGuard)
  @Get("locations")
  @ApiOperation({ summary: "List locations for company" })
  async locations(@Req() req: any) {
    return this.lookupService.locationsByCompany(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("locations")
  @ApiOperation({ summary: "Create a location" })
  async createLocation(
    @Req() req: any,
    @Body() body: { name: string; description?: string; displayOrder?: number },
  ) {
    return this.lookupService.createLocation(
      req.user.companyId,
      body.name,
      body.description,
      body.displayOrder,
    );
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Put("locations/:id")
  @ApiOperation({ summary: "Update a location" })
  async updateLocation(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: {
      name?: string;
      description?: string | null;
      displayOrder?: number | null;
      active?: boolean;
    },
  ) {
    return this.lookupService.updateLocation(req.user.companyId, id, body);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete("locations/:id")
  @ApiOperation({ summary: "Soft delete a location" })
  async deleteLocation(@Req() req: any, @Param("id") id: number) {
    return this.lookupService.deleteLocation(req.user.companyId, id);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Get("smtp-config")
  @ApiOperation({ summary: "SMTP configuration for company" })
  async smtpConfig(@Req() req: any) {
    return this.companyEmailService.smtpConfig(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("smtp-config")
  @ApiOperation({ summary: "Update SMTP configuration" })
  async updateSmtpConfig(@Req() req: any, @Body() body: SmtpConfigDto) {
    return this.companyEmailService.updateSmtpConfig(req.user.companyId, body);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("smtp-config/test")
  @ApiOperation({ summary: "Send test email using company SMTP" })
  async testSmtpConfig(@Req() req: any) {
    return this.companyEmailService.testSmtpConfig(req.user.companyId, req.user.email);
  }

  @UseGuards(StockControlAuthGuard)
  @Get("rbac-config")
  @ApiOperation({ summary: "Nav RBAC configuration for company" })
  async rbacConfig(@Req() req: any) {
    return this.rbacConfigService.navConfig(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("rbac-config")
  @ApiOperation({ summary: "Update nav RBAC configuration" })
  async updateRbacConfig(@Req() req: any, @Body() body: { config: Record<string, string[]> }) {
    return this.rbacConfigService.updateNavConfig(req.user.companyId, body.config);
  }

  @UseGuards(StockControlAuthGuard)
  @Get("roles")
  @ApiOperation({ summary: "List company roles" })
  async listRoles(@Req() req: any) {
    return this.companyRoleService.rolesForCompany(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("roles")
  @ApiOperation({ summary: "Create a custom role" })
  async createRole(@Req() req: any, @Body() body: { key: string; label: string }) {
    return this.companyRoleService.createRole(req.user.companyId, body.key, body.label);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("roles/:id")
  @ApiOperation({ summary: "Update a role label" })
  async updateRole(@Req() req: any, @Param("id") id: string, @Body() body: { label: string }) {
    return this.companyRoleService.updateRole(Number(id), req.user.companyId, body.label);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete("roles/:id")
  @ApiOperation({ summary: "Delete a custom role" })
  async deleteRole(@Req() req: any, @Param("id") id: string) {
    await this.companyRoleService.deleteRole(Number(id), req.user.companyId);
    return { success: true };
  }
}
