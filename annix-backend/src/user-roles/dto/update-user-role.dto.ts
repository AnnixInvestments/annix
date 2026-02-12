import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserRoleDto } from './create-user-role.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {
  @ApiPropertyOptional({ description: 'Updated role name', example: 'super-admin' })
  @IsString()
  @IsOptional()
  name?: string;    
}
