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
import { CreateAnnixOrbitTaskDto, UpdateAnnixOrbitTaskDto } from "../dto/annix-orbit-task.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitTaskService } from "../services/annix-orbit-task.service";

interface RecruiterAuthRequest {
  user: { companyId: number; id: number };
}

@Controller("annix-orbit/tasks")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnnixOrbitTaskController {
  constructor(private readonly taskService: AnnixOrbitTaskService) {}

  @Get()
  findAll(@Request() req: RecruiterAuthRequest) {
    return this.taskService.findForCompany(req.user.companyId);
  }

  @Post()
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  create(@Request() req: RecruiterAuthRequest, @Body() dto: CreateAnnixOrbitTaskDto) {
    return this.taskService.create(req.user.companyId, req.user.id, dto);
  }

  @Put(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  update(
    @Request() req: RecruiterAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitTaskDto,
  ) {
    return this.taskService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async remove(@Request() req: RecruiterAuthRequest, @Param("id", ParseIntPipe) id: number) {
    await this.taskService.remove(id, req.user.companyId);
    return { success: true };
  }
}
