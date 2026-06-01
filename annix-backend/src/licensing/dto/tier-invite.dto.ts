import { IsEmail, IsInt, IsString, Min } from "class-validator";

export class CreateTierInviteDto {
  @IsString()
  moduleKey!: string;

  @IsEmail()
  email!: string;

  @IsString()
  tierKey!: string;

  @IsInt()
  @Min(1)
  freeDays!: number;
}

export class GrantTierInviteDto {
  @IsInt()
  companyId!: number;
}
