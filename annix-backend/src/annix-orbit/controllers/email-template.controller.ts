import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CvEmailTemplateKind } from "../entities/annix-orbit-email-template.entity";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { EmailTemplateService } from "../services/email-template.service";

const KIND_VALUES = Object.values(CvEmailTemplateKind) as string[];

const parseKind = (raw: string): CvEmailTemplateKind => {
  if (!KIND_VALUES.includes(raw)) {
    throw new BadRequestException(`Unknown email template kind: ${raw}`);
  }
  return raw as CvEmailTemplateKind;
};

@Controller("annix-orbit/email-templates")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class EmailTemplateController {
  constructor(private readonly templates: EmailTemplateService) {}

  @Get()
  async list(@Request() req: { user: { companyId: number } }) {
    return this.templates.listForCompany(req.user.companyId);
  }

  @Get(":kind")
  async getOne(@Request() req: { user: { companyId: number } }, @Param("kind") kind: string) {
    return this.templates.forCompany(req.user.companyId, parseKind(kind));
  }

  @Patch(":kind")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async update(
    @Request() req: { user: { companyId: number } },
    @Param("kind") kind: string,
    @Body() body: { subject?: string; bodyHtml?: string; bodyText?: string },
  ) {
    const subject = (body.subject ?? "").trim();
    const bodyHtml = (body.bodyHtml ?? "").trim();
    const bodyText = (body.bodyText ?? "").trim();
    if (!subject || !bodyHtml || !bodyText) {
      throw new BadRequestException("subject, bodyHtml and bodyText are all required");
    }
    if (subject.length > 240) {
      throw new BadRequestException("subject must be 240 characters or fewer");
    }
    return this.templates.update(req.user.companyId, parseKind(kind), {
      subject,
      bodyHtml,
      bodyText,
    });
  }

  @Delete(":kind")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async reset(@Request() req: { user: { companyId: number } }, @Param("kind") kind: string) {
    return this.templates.resetToDefault(req.user.companyId, parseKind(kind));
  }

  @Post(":kind/nix-draft")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixDraft(
    @Request() req: { user: { companyId: number } },
    @Param("kind") kind: string,
    @Body() body: { instructions?: string } = {},
  ) {
    return this.templates.draftWithNix(req.user.companyId, parseKind(kind), body.instructions);
  }
}
