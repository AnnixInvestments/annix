import type { Assignment } from "@annix/product-data/teacher-assistant";
import { IsObject } from "class-validator";

export class ExportAssignmentDocxDto {
  @IsObject()
  assignment!: Assignment;
}
