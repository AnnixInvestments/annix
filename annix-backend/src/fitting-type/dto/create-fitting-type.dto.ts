import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateFittingTypeDto {
  @ApiProperty({ description: "Name of the fitting type", example: "Elbow" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
