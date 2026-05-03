import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterTeacherDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  schoolName?: string;
}

export class LoginTeacherDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  password!: string;
}
