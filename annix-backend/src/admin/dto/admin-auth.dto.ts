import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AdminLoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export class AdminRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class AdminRefreshTokenResponseDto {
  accessToken: string;
}

export class AdminUserProfileDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: Date;
  lastActiveAt?: Date;
}
