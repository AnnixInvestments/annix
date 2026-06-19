import { ApiProperty } from "@nestjs/swagger";
import { AppPermission } from "./app-permission.entity";
import { AppRole } from "./app-role.entity";
import { UserAppAccess } from "./user-app-access.entity";

export class App {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @ApiProperty({
    description: "Unique code for the app",
    example: "rfq-platform",
  })
  code: string;

  @ApiProperty({
    description: "Display name of the app",
    example: "RFQ Platform",
  })
  name: string;

  @ApiProperty({
    description: "Description of the app",
    example: "Request for Quote management system",
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: "Icon identifier for the app",
    example: "file-text",
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: "Whether the app is active",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: "Display order for sorting",
    example: 1,
  })
  displayOrder: number;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  permissions: AppPermission[];

  roles: AppRole[];

  userAccess: UserAppAccess[];
}
