import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import type { DismissReasonMuteAction } from "../entities/orbit-dismiss-reason.entity";
import { OrbitDismissReasonService } from "../services/orbit-dismiss-reason.service";

const MUTE_ACTIONS = ["company", "category"] as const;

class CreateDismissReasonDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @IsIn(MUTE_ACTIONS)
  muteAction?: DismissReasonMuteAction | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateDismissReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsIn(MUTE_ACTIONS)
  muteAction?: DismissReasonMuteAction | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller("admin/annix-orbit/dismiss-reasons")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitDismissReasonsController {
  constructor(private readonly service: OrbitDismissReasonService) {}

  @Get()
  @Roles("admin")
  list() {
    return this.service.listAll();
  }

  @Post()
  @Roles("admin")
  create(@Body() dto: CreateDismissReasonDto) {
    return this.service.create({
      code: dto.code,
      label: dto.label,
      muteAction: dto.muteAction ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    });
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDismissReasonDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
