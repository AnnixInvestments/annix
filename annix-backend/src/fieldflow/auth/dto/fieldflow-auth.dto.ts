import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class FieldFlowRegisterDto {
  @ApiProperty({ description: "User email address", example: "rep@company.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Password (minimum 8 characters)", example: "SecurePass123!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: "First name", example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: "Last name", example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class FieldFlowLoginDto {
  @ApiProperty({ description: "User email address", example: "rep@company.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Password", example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class FieldFlowRefreshTokenDto {
  @ApiProperty({ description: "Refresh token" })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class FieldFlowAuthResponseDto {
  @ApiProperty({ description: "JWT access token" })
  accessToken: string;

  @ApiProperty({ description: "JWT refresh token" })
  refreshToken: string;

  @ApiProperty({ description: "Token expiry in seconds", example: 3600 })
  expiresIn: number;

  @ApiProperty({ description: "User ID" })
  userId: number;

  @ApiProperty({ description: "User email" })
  email: string;

  @ApiProperty({ description: "User first name" })
  firstName: string;

  @ApiProperty({ description: "User last name" })
  lastName: string;

  @ApiPropertyOptional({ description: "Whether setup is completed" })
  setupCompleted?: boolean;
}

export class FieldFlowProfileResponseDto {
  @ApiProperty({ description: "User ID" })
  userId: number;

  @ApiProperty({ description: "User email" })
  email: string;

  @ApiProperty({ description: "User first name" })
  firstName: string;

  @ApiProperty({ description: "User last name" })
  lastName: string;

  @ApiProperty({ description: "Whether setup is completed" })
  setupCompleted: boolean;
}

export class CheckEmailAvailableDto {
  @ApiProperty({ description: "Email to check", example: "rep@company.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CheckEmailResponseDto {
  @ApiProperty({ description: "Whether the email is available" })
  available: boolean;
}
