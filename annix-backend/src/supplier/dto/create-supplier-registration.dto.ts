import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierRegistrationDto {
  @ApiProperty({ description: 'Email address (used as login)', example: 'supplier@company.co.za' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    example: 'SecureP@ss!',
  })
  @IsString()
  @MinLength(10)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/,
    {
      message:
        'Password must be at least 10 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;
}
