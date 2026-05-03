import type { Assignment } from "@annix/product-data/teacher-assistant";
import { IsObject } from "class-validator";

export class ExportAssignmentPdfDto {
  @IsObject()
  assignment!: Assignment;
}
