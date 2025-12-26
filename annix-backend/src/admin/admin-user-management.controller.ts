import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUserManagementService } from './admin-user-management.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AdminUserQueryDto,
  CreateAdminUserDto,
  UpdateAdminRoleDto,
  DeactivateAdminUserDto,
  AdminUserListResponseDto,
  AdminUserDetailDto,
} from './dto/admin-user-management.dto';
import { User } from '../user/entities/user.entity';

@ApiTags('Admin User Management')
@Controller('admin/users')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('admin') // Only admins can manage users
@ApiBearerAuth()
export class AdminUserManagementController {
  constructor(private readonly userManagementService: AdminUserManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List all admin users' })
  @ApiResponse({
    status: 200,
    description: 'Admin users retrieved successfully',
    type: AdminUserListResponseDto,
  })
  async listAdminUsers(
    @Query() queryDto: AdminUserQueryDto,
  ): Promise<AdminUserListResponseDto> {
    return this.userManagementService.listAdminUsers(queryDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin user' })
  @ApiResponse({
    status: 201,
    description: 'Admin user created successfully',
    type: User,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async createAdminUser(
    @Body() createDto: CreateAdminUserDto,
    @Request() req,
  ): Promise<User> {
    const createdBy = req.user.sub || req.user.userId;
    return this.userManagementService.createAdminUser(createDto, createdBy);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin user detail' })
  @ApiResponse({
    status: 200,
    description: 'User detail retrieved successfully',
    type: AdminUserDetailDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAdminUserDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminUserDetailDto> {
    return this.userManagementService.getAdminUserDetail(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update admin user role' })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAdminRoleDto,
    @Request() req,
  ): Promise<User> {
    const updatedBy = req.user.sub || req.user.userId;
    return this.userManagementService.updateAdminRole(id, updateDto, updatedBy);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate admin user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot deactivate own account' })
  async deactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() deactivateDto: DeactivateAdminUserDto,
    @Request() req,
  ): Promise<{ message: string }> {
    const deactivatedBy = req.user.sub || req.user.userId;
    await this.userManagementService.deactivateAdminUser(
      id,
      deactivateDto,
      deactivatedBy,
    );
    return { message: 'User deactivated successfully' };
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate admin user' })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<User> {
    const reactivatedBy = req.user.sub || req.user.userId;
    return this.userManagementService.reactivateAdminUser(id, reactivatedBy);
  }
}
