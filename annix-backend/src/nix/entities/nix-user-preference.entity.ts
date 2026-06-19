import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export class NixUserPreference {
  @ApiProperty({ description: "Primary key" })
  id: number;

  user: User;

  userId: number;

  @ApiProperty({ description: "Preference category" })
  category?: string;

  @ApiProperty({ description: "Preference key/identifier" })
  preferenceKey: string;

  @ApiProperty({ description: "Preference value" })
  preferenceValue: string;

  @ApiProperty({ description: "Additional preference data as JSON" })
  metadata?: Record<string, any>;

  @ApiProperty({ description: "Number of times this preference was used" })
  usageCount: number;

  createdAt: Date;

  updatedAt: Date;
}
