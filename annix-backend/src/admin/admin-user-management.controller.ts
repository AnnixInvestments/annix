import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ApiMessageResponse, messageResponse } from "../shared/dto";
import { User } from "../user/entities/user.entity";
import { AdminUserManagementService } from "./admin-user-management.service";
import {
  AdminUserDetailDto,
  AdminUserListResponseDto,
  AdminUserQueryDto,
  CreateAdminUserDto,
  DeactivateAdminUserDto,
  UpdateAdminRoleDto,
} from "./dto/admin-user-management.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin User Management")
@Controller("admin/users")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin") // Only admins can manage users
@ApiBearerAuth()
export class AdminUserManagementController {
  constructor(private readonly userManagementService: AdminUserManagementService) {}

  @Get()
  @ApiOperation({ summary: "List all admin users" })
  @ApiResponse({
    status: 200,
    description: "Admin users retrieved successfully",
    type: AdminUserListResponseDto,
  })
  async listAdminUsers(@Query() queryDto: AdminUserQueryDto): Promise<AdminUserListResponseDto> {
    return this.userManagementService.listAdminUsers(queryDto);
  }

  @Post()
  @ApiOperation({ summary: "Create a new admin user" })
  @ApiResponse({
    status: 201,
    description: "Admin user created successfully",
    type: User,
  })
  @ApiResponse({ status: 409, description: "User already exists" })
  async createAdminUser(@Body() createDto: CreateAdminUserDto, @Request() req): Promise<User> {
    const createdBy = req.user.sub || req.user.userId;
    return this.userManagementService.createAdminUser(createDto, createdBy);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get admin user detail" })
  @ApiResponse({
    status: 200,
    description: "User detail retrieved successfully",
    type: AdminUserDetailDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getAdminUserDetail(@Param("id", ParseIntPipe) id: number): Promise<AdminUserDetailDto> {
    return this.userManagementService.getAdminUserDetail(id);
  }

  @Patch(":id/role")
  @ApiOperation({ summary: "Update admin user role" })
  @ApiResponse({
    status: 200,
    description: "User role updated successfully",
    type: User,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async updateUserRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateAdminRoleDto,
    @Request() req,
  ): Promise<User> {
    const updatedBy = req.user.sub || req.user.userId;
    return this.userManagementService.updateAdminRole(id, updateDto, updatedBy);
  }

  @Post(":id/deactivate")
  @ApiOperation({ summary: "Deactivate admin user" })
  @ApiResponse({ status: 200, description: "User deactivated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 403, description: "Cannot deactivate own account" })
  async deactivateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() deactivateDto: DeactivateAdminUserDto,
    @Request() req,
  ): Promise<ApiMessageResponse> {
    const deactivatedBy = req.user.sub || req.user.userId;
    await this.userManagementService.deactivateAdminUser(id, deactivateDto, deactivatedBy);
    return messageResponse("User deactivated successfully");
  }

  @Post(":id/reactivate")
  @ApiOperation({ summary: "Reactivate admin user" })
  @ApiResponse({
    status: 200,
    description: "User reactivated successfully",
    type: User,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async reactivateUser(@Param("id", ParseIntPipe) id: number, @Request() req): Promise<User> {
    const reactivatedBy = req.user.sub || req.user.userId;
    return this.userManagementService.reactivateAdminUser(id, reactivatedBy);
  }
}
