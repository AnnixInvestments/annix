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
  UseGuards,
} from "@nestjs/common";
import {
  CreateAnnixOrbitComplianceItemDto,
  UpdateAnnixOrbitComplianceItemDto,
} from "../dto/annix-orbit-compliance-item.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitComplianceItemService } from "../services/annix-orbit-compliance-item.service";

@Controller("annix-orbit/compliance-items")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitComplianceItemController {
  constructor(private readonly complianceService: AnnixOrbitComplianceItemService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.complianceService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.complianceService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number } },
    @Body() dto: CreateAnnixOrbitComplianceItemDto,
  ) {
    return this.complianceService.create(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitComplianceItemDto,
  ) {
    return this.complianceService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.complianceService.remove(id, req.user.companyId);
    return { success: true };
  }
}
