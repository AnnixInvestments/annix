import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class PasskeyAuthOptionsRequestDto {
  @ApiProperty({ example: "user@example.com", required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class PasskeyAuthVerifyRequestDto {
  @ApiProperty({ description: "AuthenticationResponseJSON from @simplewebauthn/browser" })
  @IsObject()
  response: Record<string, unknown>;

  @ApiProperty({
    example: "admin",
    required: false,
    description: "Portal app code — when set, issue portal-specific tokens instead of generic JWT",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appCode?: string;
}

export class PasskeyRegisterVerifyRequestDto {
  @ApiProperty({ description: "RegistrationResponseJSON from @simplewebauthn/browser" })
  @IsObject()
  response: Record<string, unknown>;

  @ApiProperty({ example: "MacBook Touch ID", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

export class PasskeyRenameRequestDto {
  @ApiProperty({ example: "Work laptop" })
  @IsString()
  @MaxLength(120)
  deviceName: string;
}

export class PasskeySummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  deviceName: string | null;

  @ApiProperty({ type: [String] })
  transports: string[];

  @ApiProperty()
  backupEligible: boolean;

  @ApiProperty()
  backupState: boolean;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
