import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';

export enum AdminUserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search name or email

  @IsOptional()
  @IsEnum(AdminUserRole)
  role?: AdminUserRole;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CreateAdminUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(AdminUserRole)
  role: AdminUserRole;

  @IsOptional()
  @IsString()
  temporaryPassword?: string; // Auto-generated if not provided
}

export class UpdateAdminRoleDto {
  @IsEnum(AdminUserRole)
  role: AdminUserRole;
}

export class DeactivateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminUserListItemDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export class AdminUserListResponseDto {
  items: AdminUserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AdminUserDetailDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  loginHistory: AdminLoginHistoryItemDto[];
  auditTrail: AdminAuditItemDto[];
}

export class AdminLoginHistoryItemDto {
  id: number;
  timestamp: Date;
  clientIp: string;
  userAgent: string;
  success: boolean;
}

export class AdminAuditItemDto {
  id: number;
  timestamp: Date;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  clientIp: string;
}
