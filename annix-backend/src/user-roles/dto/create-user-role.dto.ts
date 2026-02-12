import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserRoleDto {
  @ApiProperty({ description: 'Name of the role', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;
}
