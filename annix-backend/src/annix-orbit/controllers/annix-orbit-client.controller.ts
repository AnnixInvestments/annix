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
  CreateAnnixOrbitClientDto,
  UpdateAnnixOrbitClientDto,
} from "../dto/annix-orbit-client.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitClientService } from "../services/annix-orbit-client.service";

@Controller("annix-orbit/clients")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitClientController {
  constructor(private readonly clientService: AnnixOrbitClientService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.clientService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.clientService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateAnnixOrbitClientDto) {
    return this.clientService.create(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitClientDto,
  ) {
    return this.clientService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.clientService.remove(id, req.user.companyId);
    return { success: true };
  }
}
