import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ApiMessageResponse, messageResponse } from "../shared/dto";
import {
  AssignUserAccessDto,
  UpdateUserAccessDto,
  UserAccessResponseDto,
} from "./dto/assign-user-access.dto";
import { InviteUserDto, InviteUserResponseDto } from "./dto/invite-user.dto";
import {
  CreateRoleDto,
  RoleProductsResponseDto,
  RoleResponseDto,
  SetRoleProductsDto,
  UpdateRoleDto,
} from "./dto/role-management.dto";
import { UserWithAccessSummaryDto } from "./dto/user-with-access-summary.dto";
import { App, AppPermission, AppRole } from "./entities";
import { RbacService } from "./rbac.service";

interface AppDetailResponse extends App {
  permissions: AppPermission[];
  roles: AppRole[];
}

@ApiTags("Admin RBAC")
@Controller("admin/rbac")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get("apps")
  @ApiOperation({ summary: "List all apps" })
  @ApiResponse({
    status: 200,
    description: "List of all available apps",
    type: [App],
  })
  async listApps(): Promise<App[]> {
    return this.rbacService.allApps();
  }

  @Get("apps/:code")
  @ApiOperation({ summary: "Get app details with permissions and roles" })
  @ApiParam({ name: "code", description: "App code", example: "rfq-platform" })
  @ApiResponse({
    status: 200,
    description: "App with permissions and roles",
  })
  @ApiResponse({ status: 404, description: "App not found" })
  async appDetails(@Param("code") code: string): Promise<AppDetailResponse> {
    return this.rbacService.appWithDetails(code);
  }

  @Get("apps/:code/users")
  @ApiOperation({ summary: "List users with access to an app" })
  @ApiParam({ name: "code", description: "App code", example: "rfq-platform" })
  @ApiResponse({
    status: 200,
    description: "Users with access to the app",
    type: [UserAccessResponseDto],
  })
  @ApiResponse({ status: 404, description: "App not found" })
  async usersWithAccess(@Param("code") code: string): Promise<UserAccessResponseDto[]> {
    return this.rbacService.usersWithAccess(code);
  }

  @Get("users/all")
  @ApiOperation({ summary: "List all users with their app access summary" })
  @ApiResponse({
    status: 200,
    description: "All users with their access across all apps",
    type: [UserWithAccessSummaryDto],
  })
  async allUsersWithAccessSummary(): Promise<UserWithAccessSummaryDto[]> {
    return this.rbacService.allUsersWithAccessSummary();
  }

  @Get("users/search")
  @ApiOperation({ summary: "Search users by email or name" })
  @ApiQuery({
    name: "q",
    description: "Search query (email or name)",
    example: "john",
  })
  @ApiResponse({
    status: 200,
    description: "Matching users",
  })
  async searchUsers(
    @Query("q") query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    return this.rbacService.searchUsers(query || "");
  }

  @Post("users/:userId/access")
  @ApiOperation({ summary: "Assign app access to a user" })
  @ApiParam({ name: "userId", description: "User ID", example: 42 })
  @ApiResponse({
    status: 201,
    description: "Access assigned successfully",
    type: UserAccessResponseDto,
  })
  @ApiResponse({ status: 404, description: "User or app not found" })
  @ApiResponse({ status: 409, description: "User already has access" })
  async assignAccess(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: AssignUserAccessDto,
    @Request() req,
  ): Promise<UserAccessResponseDto> {
    const grantedById = req.user.sub || req.user.userId;
    return this.rbacService.assignAccess(userId, dto, grantedById);
  }

  @Patch("access/:accessId")
  @ApiOperation({ summary: "Update user access" })
  @ApiParam({ name: "accessId", description: "Access record ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Access updated successfully",
    type: UserAccessResponseDto,
  })
  @ApiResponse({ status: 404, description: "Access record not found" })
  async updateAccess(
    @Param("accessId", ParseIntPipe) accessId: number,
    @Body() dto: UpdateUserAccessDto,
  ): Promise<UserAccessResponseDto> {
    return this.rbacService.updateAccess(accessId, dto);
  }

  @Delete("access/:accessId")
  @ApiOperation({ summary: "Revoke user access" })
  @ApiParam({ name: "accessId", description: "Access record ID", example: 1 })
  @ApiResponse({ status: 200, description: "Access revoked successfully" })
  @ApiResponse({ status: 404, description: "Access record not found" })
  async revokeAccess(
    @Param("accessId", ParseIntPipe) accessId: number,
  ): Promise<ApiMessageResponse> {
    await this.rbacService.revokeAccess(accessId);
    return messageResponse("Access revoked successfully");
  }

  @Post("invite")
  @ApiOperation({ summary: "Invite a new user and grant app access" })
  @ApiResponse({
    status: 201,
    description: "User invited successfully",
    type: InviteUserResponseDto,
  })
  @ApiResponse({ status: 404, description: "App not found" })
  @ApiResponse({ status: 409, description: "User already has access to app" })
  async inviteUser(@Body() dto: InviteUserDto, @Request() req): Promise<InviteUserResponseDto> {
    const grantedById = req.user.sub || req.user.userId;
    return this.rbacService.inviteUser(dto, grantedById);
  }

  @Post("apps/:code/roles")
  @ApiOperation({ summary: "Create a new role for an app" })
  @ApiParam({ name: "code", description: "App code", example: "rfq-platform" })
  @ApiResponse({
    status: 201,
    description: "Role created successfully",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: "App not found" })
  @ApiResponse({ status: 409, description: "Role code already exists" })
  async createRole(
    @Param("code") code: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rbacService.createRole(code, dto);
  }

  @Get("roles/:roleId")
  @ApiOperation({ summary: "Get role by ID" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role details",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async roleById(@Param("roleId", ParseIntPipe) roleId: number): Promise<RoleResponseDto> {
    return this.rbacService.roleById(roleId);
  }

  @Patch("roles/:roleId")
  @ApiOperation({ summary: "Update a role" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role updated successfully",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async updateRole(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rbacService.updateRole(roleId, dto);
  }

  @Delete("roles/:roleId")
  @ApiOperation({ summary: "Delete a role" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async deleteRole(
    @Param("roleId", ParseIntPipe) roleId: number,
  ): Promise<{ message: string; reassignedUsers: number }> {
    return this.rbacService.deleteRole(roleId);
  }

  @Get("roles/:roleId/products")
  @ApiOperation({ summary: "Get products accessible by a role" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role product access",
    type: RoleProductsResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async roleProducts(
    @Param("roleId", ParseIntPipe) roleId: number,
  ): Promise<RoleProductsResponseDto> {
    return this.rbacService.roleProducts(roleId);
  }

  @Put("roles/:roleId/products")
  @ApiOperation({ summary: "Set products accessible by a role" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role product access updated",
    type: RoleProductsResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async setRoleProducts(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() dto: SetRoleProductsDto,
  ): Promise<RoleProductsResponseDto> {
    return this.rbacService.setRoleProducts(roleId, dto.productKeys);
  }
}
