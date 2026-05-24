import { IsInt, Min } from "class-validator";

export class AnnixSentinelToggleChecklistDto {
  @IsInt()
  @Min(0)
  stepIndex!: number;
}
