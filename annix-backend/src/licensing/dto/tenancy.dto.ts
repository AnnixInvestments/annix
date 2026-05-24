import { IsEmail, IsInt, IsOptional, IsString } from "class-validator";

export class CreateTenantDto {
  @IsString()
  companyName: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  @IsString()
  ownerFirstName?: string;

  @IsOptional()
  @IsString()
  ownerLastName?: string;

  @IsString()
  ownerRoleCode: string;

  @IsString()
  tier: string;
}

export class InviteTenantUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  roleCode: string;
}

export class TransferOwnerDto {
  @IsInt()
  newOwnerUserId: number;
}
