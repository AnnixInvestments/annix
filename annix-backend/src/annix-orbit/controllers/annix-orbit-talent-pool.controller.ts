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
  CreateAnnixOrbitTalentPoolDto,
  UpdateAnnixOrbitTalentPoolDto,
} from "../dto/annix-orbit-talent-pool.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitTalentPoolService } from "../services/annix-orbit-talent-pool.service";

@Controller("annix-orbit/talent-pools")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitTalentPoolController {
  constructor(private readonly poolService: AnnixOrbitTalentPoolService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.poolService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.poolService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number } },
    @Body() dto: CreateAnnixOrbitTalentPoolDto,
  ) {
    return this.poolService.create(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitTalentPoolDto,
  ) {
    return this.poolService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.poolService.remove(id, req.user.companyId);
    return { success: true };
  }
}
