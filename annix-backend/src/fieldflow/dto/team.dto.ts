import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { OrganizationPlan } from "../entities/organization.entity";
import { TeamMemberStatus, TeamRole } from "../entities/team-member.entity";
import { TerritoryBounds } from "../entities/territory.entity";

export class CreateOrganizationDto {
  @ApiProperty({ example: "Acme Sales Team" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: "Industrial Piping" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: "Acme Sales Team" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: "Industrial Piping" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ enum: OrganizationPlan })
  @IsEnum(OrganizationPlan)
  @IsOptional()
  plan?: OrganizationPlan;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  maxMembers?: number;
}

export class OrganizationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  ownerId: number;

  @ApiProperty({ enum: OrganizationPlan })
  plan: OrganizationPlan;

  @ApiProperty()
  maxMembers: number;

  @ApiPropertyOptional()
  industry: string | null;

  @ApiPropertyOptional()
  logoUrl: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class TeamMemberResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ enum: TeamRole })
  role: TeamRole;

  @ApiProperty({ enum: TeamMemberStatus })
  status: TeamMemberStatus;

  @ApiPropertyOptional()
  reportsToId: number | null;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  userEmail?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole;
}

export class SetReportsToDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  reportsToId: number | null;
}

export class CreateTerritoryDto {
  @ApiProperty({ example: "Gauteng Region" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ["Gauteng", "Mpumalanga"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  provinces?: string[];

  @ApiPropertyOptional({ example: ["Johannesburg", "Pretoria"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  bounds?: TerritoryBounds;
}

export class UpdateTerritoryDto {
  @ApiPropertyOptional({ example: "Gauteng Region" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  provinces?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  bounds?: TerritoryBounds;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TerritoryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  provinces: string[] | null;

  @ApiPropertyOptional()
  cities: string[] | null;

  @ApiPropertyOptional()
  bounds: TerritoryBounds | null;

  @ApiPropertyOptional()
  assignedToId: number | null;

  @ApiPropertyOptional()
  assignedToName?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  prospectCount?: number;
}

export class AssignTerritoryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  userId: number | null;
}

export class CreateInvitationDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "John Smith" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  inviteeName?: string;

  @ApiPropertyOptional({ enum: TeamRole, default: TeamRole.REP })
  @IsEnum(TeamRole)
  @IsOptional()
  role?: TeamRole;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  territoryId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}

export class InvitationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  inviteeName: string | null;

  @ApiProperty({ enum: TeamRole })
  role: TeamRole;

  @ApiPropertyOptional()
  territoryId: number | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  message: string | null;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  invitedByName?: string;

  @ApiPropertyOptional()
  organizationName?: string;
}

export class HandoffProspectDto {
  @ApiProperty()
  @IsNumber()
  toUserId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkHandoffDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  prospectIds: number[];

  @ApiProperty()
  @IsNumber()
  toUserId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class TeamActivityResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiPropertyOptional()
  userName?: string;

  @ApiProperty()
  activityType: string;

  @ApiProperty()
  entityType: string;

  @ApiPropertyOptional()
  entityId: number | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class ManagerDashboardResponseDto {
  @ApiProperty()
  teamSize: number;

  @ApiProperty()
  activeReps: number;

  @ApiProperty()
  totalPipelineValue: number;

  @ApiProperty()
  teamMeetingsThisMonth: number;

  @ApiProperty()
  teamDealsWonThisMonth: number;

  @ApiProperty()
  teamDealsLostThisMonth: number;
}

export class MemberPerformanceResponseDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  prospectCount: number;

  @ApiProperty()
  pipelineValue: number;

  @ApiProperty()
  dealsWon: number;

  @ApiProperty()
  dealsLost: number;

  @ApiProperty()
  meetingsCompleted: number;

  @ApiProperty()
  winRate: number;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  value: number;
}
