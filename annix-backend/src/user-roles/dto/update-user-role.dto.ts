import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CreateUserRoleDto } from "./create-user-role.dto";

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {
  @ApiPropertyOptional({
    description: "Updated role name",
    example: "super-admin",
  })
  @IsString()
  @IsOptional()
  name?: string;
}
