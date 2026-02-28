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
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { RequirePermission } from "../rbac/decorators/require-permission.decorator";
import {
  AssignUserAccessDto,
  UpdateUserAccessDto,
  UserAccessResponseDto,
} from "../rbac/dto/assign-user-access.dto";
import { InviteUserDto, InviteUserResponseDto } from "../rbac/dto/invite-user.dto";
import { CreateRoleDto, RoleResponseDto, UpdateRoleDto } from "../rbac/dto/role-management.dto";
import { AppPermission } from "../rbac/entities";
import { AppPermissionGuard } from "../rbac/guards/app-permission.guard";
import { RbacService } from "../rbac/rbac.service";
import { ApiMessageResponse, messageResponse } from "../shared/dto";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";

interface AuRubberAccessInfo {
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  isAdmin: boolean;
}

interface RoleWithPermissionsAndCount extends RoleResponseDto {
  permissions: string[];
  userCount: number;
}

const APP_CODE = "au-rubber";

@ApiTags("AU Rubber Admin")
@Controller("rubber-lining/admin")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard)
@ApiBearerAuth()
export class RubberAdminController {
  constructor(private readonly rbacService: RbacService) {}

  @Get("access/me")
  @ApiOperation({ summary: "Get current user's access details" })
  @ApiResponse({
    status: 200,
    description: "Current user's role and permissions",
  })
  async myAccess(@Request() req): Promise<AuRubberAccessInfo> {
    const userId = req.user.sub || req.user.userId;
    return this.rbacService.userAccessDetails(userId, APP_CODE);
  }

  @Get("access/users")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "List users with AU Rubber access" })
  @ApiResponse({
    status: 200,
    description: "Users with access to AU Rubber",
    type: [UserAccessResponseDto],
  })
  async accessUsers(): Promise<UserAccessResponseDto[]> {
    return this.rbacService.usersWithAccess(APP_CODE);
  }

  @Get("access/roles")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "List available roles with their permissions" })
  @ApiResponse({
    status: 200,
    description: "Roles with permissions and user counts",
  })
  async accessRoles(): Promise<RoleWithPermissionsAndCount[]> {
    return this.rbacService.rolesWithPermissions(APP_CODE);
  }

  @Get("access/permissions")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "List all available permissions" })
  @ApiResponse({
    status: 200,
    description: "All permissions for AU Rubber",
    type: [AppPermission],
  })
  async accessPermissions(): Promise<AppPermission[]> {
    return this.rbacService.appPermissions(APP_CODE);
  }

  @Post("access/roles")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Create a new role" })
  @ApiResponse({
    status: 201,
    description: "Role created successfully",
    type: RoleResponseDto,
  })
  async createRole(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rbacService.createRole(APP_CODE, dto);
  }

  @Patch("access/roles/:roleId")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Update role name/description" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role updated successfully",
    type: RoleResponseDto,
  })
  async updateRole(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rbacService.updateRole(roleId, dto);
  }

  @Put("access/roles/:roleId/permissions")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Set role permissions" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role permissions updated successfully",
  })
  async setRolePermissions(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() dto: { permissionCodes: string[] },
  ): Promise<ApiMessageResponse> {
    await this.rbacService.setRolePermissions(roleId, dto.permissionCodes);
    return messageResponse("Role permissions updated successfully");
  }

  @Delete("access/roles/:roleId")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Delete a role" })
  @ApiParam({ name: "roleId", description: "Role ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Role deleted successfully",
  })
  async deleteRole(
    @Param("roleId", ParseIntPipe) roleId: number,
  ): Promise<{ message: string; reassignedUsers: number }> {
    return this.rbacService.deleteRole(roleId);
  }

  @Post("access/users/:userId")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Grant user access with role" })
  @ApiParam({ name: "userId", description: "User ID", example: 42 })
  @ApiResponse({
    status: 201,
    description: "Access granted successfully",
    type: UserAccessResponseDto,
  })
  async grantAccess(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: { roleCode: string },
    @Request() req,
  ): Promise<UserAccessResponseDto> {
    const grantedById = req.user.sub || req.user.userId;
    const accessDto: AssignUserAccessDto = {
      appCode: APP_CODE,
      roleCode: dto.roleCode,
    };
    return this.rbacService.assignAccess(userId, accessDto, grantedById);
  }

  @Patch("access/users/:accessId")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Update user's role" })
  @ApiParam({ name: "accessId", description: "Access record ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Access updated successfully",
    type: UserAccessResponseDto,
  })
  async updateAccess(
    @Param("accessId", ParseIntPipe) accessId: number,
    @Body() dto: { roleCode: string },
  ): Promise<UserAccessResponseDto> {
    const updateDto: UpdateUserAccessDto = {
      roleCode: dto.roleCode,
    };
    return this.rbacService.updateAccess(accessId, updateDto);
  }

  @Delete("access/users/:accessId")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Revoke user access" })
  @ApiParam({ name: "accessId", description: "Access record ID", example: 1 })
  @ApiResponse({
    status: 200,
    description: "Access revoked successfully",
  })
  async revokeAccess(
    @Param("accessId", ParseIntPipe) accessId: number,
  ): Promise<ApiMessageResponse> {
    await this.rbacService.revokeAccess(accessId);
    return messageResponse("Access revoked successfully");
  }

  @Post("access/invite")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Invite new user with role" })
  @ApiResponse({
    status: 201,
    description: "User invited successfully",
    type: InviteUserResponseDto,
  })
  async inviteUser(
    @Body() dto: { email: string; firstName?: string; lastName?: string; roleCode: string },
    @Request() req,
  ): Promise<InviteUserResponseDto> {
    const grantedById = req.user.sub || req.user.userId;
    const inviteDto: InviteUserDto = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      appCode: APP_CODE,
      roleCode: dto.roleCode,
    };
    return this.rbacService.inviteUser(inviteDto, grantedById);
  }

  @Get("users/search")
  @UseGuards(AppPermissionGuard)
  @RequirePermission(APP_CODE, "settings:manage")
  @ApiOperation({ summary: "Search users by email or name" })
  @ApiResponse({
    status: 200,
    description: "Matching users",
  })
  async searchUsers(
    @Request() req,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    const query = req.query.q || "";
    return this.rbacService.searchUsers(query);
  }
}
