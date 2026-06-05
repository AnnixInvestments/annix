import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { ApiMessageResponse, messageResponse } from "../../shared/dto";
import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AdminOrbitUserService } from "../services/admin-orbit-user.service";

const USER_TYPES = [
  AnnixOrbitUserType.COMPANY,
  AnnixOrbitUserType.RECRUITER,
  AnnixOrbitUserType.INDIVIDUAL,
  AnnixOrbitUserType.STUDENT,
];

class InviteOrbitUserDto {
  @IsString()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(120)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsIn(USER_TYPES)
  userType: AnnixOrbitUserType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tier?: string;
}

class UpdateOrbitUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tier?: string;
}

@Controller("admin/annix-orbit/users")
@UseGuards(AdminAuthGuard)
export class AdminOrbitUsersController {
  constructor(private readonly userService: AdminOrbitUserService) {}

  @Get()
  async list(
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.userService.list({
      userType: type ?? null,
      search: search ?? null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post("invite")
  async invite(@Body() dto: InviteOrbitUserDto): Promise<{ userId: number; email: string }> {
    return this.userService.invite({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      userType: dto.userType,
      companyName: dto.companyName ?? null,
      tier: dto.tier ?? null,
    });
  }

  @Post(":userId/resend-invite")
  async resendInvite(@Param("userId", ParseIntPipe) userId: number): Promise<ApiMessageResponse> {
    await this.userService.resendInvite(userId);
    return messageResponse("Invitation resent");
  }

  @Patch(":userId")
  async update(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: UpdateOrbitUserDto,
  ): Promise<ApiMessageResponse> {
    await this.userService.update(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      status: dto.status,
      tier: dto.tier,
    });
    return messageResponse("User updated");
  }

  @Post(":userId/deactivate")
  async deactivate(@Param("userId", ParseIntPipe) userId: number): Promise<ApiMessageResponse> {
    await this.userService.deactivate(userId);
    return messageResponse("User deactivated");
  }

  @Post(":userId/reactivate")
  async reactivate(@Param("userId", ParseIntPipe) userId: number): Promise<ApiMessageResponse> {
    await this.userService.reactivate(userId);
    return messageResponse("User reactivated");
  }

  @Delete(":userId")
  async remove(@Param("userId", ParseIntPipe) userId: number): Promise<ApiMessageResponse> {
    await this.userService.remove(userId);
    return messageResponse("User deleted");
  }
}
