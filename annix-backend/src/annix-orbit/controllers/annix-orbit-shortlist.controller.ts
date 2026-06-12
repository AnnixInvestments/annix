import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  CreateAnnixOrbitShortlistDto,
  UpdateAnnixOrbitShortlistDto,
} from "../dto/annix-orbit-shortlist.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitShortlistService } from "../services/annix-orbit-shortlist.service";
import { AnnixOrbitShortlistDeliveryService } from "../services/annix-orbit-shortlist-delivery.service";

@Controller("annix-orbit/shortlists")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitShortlistController {
  constructor(
    private readonly shortlistService: AnnixOrbitShortlistService,
    private readonly deliveryService: AnnixOrbitShortlistDeliveryService,
  ) {}

  @Get(":id/pdf")
  async pdf(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.deliveryService.renderPdf(id, req.user.companyId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(":id/email")
  emailToClient(
    @Request() req: { user: { companyId: number; id: number; name?: string } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { email?: string; message?: string },
  ) {
    return this.deliveryService.emailToClient(
      id,
      req.user.companyId,
      { id: req.user.id, name: req.user.name ?? "" },
      body.email ?? "",
      body.message ?? null,
    );
  }

  @Post(":id/share")
  createShareLink(
    @Request() req: { user: { companyId: number; id: number; name?: string } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.deliveryService.createShareLink(id, req.user.companyId, {
      id: req.user.id,
      name: req.user.name ?? "",
    });
  }

  @Delete(":id/share")
  revokeShareLink(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.deliveryService.revokeShareLink(id, req.user.companyId);
  }

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.shortlistService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.shortlistService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number } },
    @Body() dto: CreateAnnixOrbitShortlistDto,
  ) {
    return this.shortlistService.create(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number; id: number; name: string } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitShortlistDto,
  ) {
    return this.shortlistService.update(
      id,
      req.user.companyId,
      { id: req.user.id, name: req.user.name },
      dto,
    );
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.shortlistService.remove(id, req.user.companyId);
    return { success: true };
  }
}
