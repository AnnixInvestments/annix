import { IsObject } from "class-validator";

export class CorrectDraftDto {
  @IsObject()
  value: Record<string, unknown>;
}
