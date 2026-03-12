import { IsInt, Min } from "class-validator";

export class ComplySaToggleChecklistDto {
  @IsInt()
  @Min(0)
  stepIndex!: number;
}
