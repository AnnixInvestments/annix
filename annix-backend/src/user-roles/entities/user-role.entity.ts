import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export class UserRole {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Role name", example: "admin" })
  name: string;

  users: User[];

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
