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
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { OrbitCredentialTypeService } from "../services/orbit-credential-type.service";

class CreateCredentialTypeDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateCredentialTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller("admin/annix-orbit/credential-types")
@UseGuards(AdminAuthGuard)
export class AdminOrbitCredentialTypesController {
  constructor(private readonly service: OrbitCredentialTypeService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: CreateCredentialTypeDto) {
    return this.service.create({
      code: dto.code,
      label: dto.label,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    });
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCredentialTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
