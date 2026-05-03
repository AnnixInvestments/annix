import {
  ASSIGNMENT_SECTIONS,
  type Assignment,
  type AssignmentSection,
} from "@annix/product-data/teacher-assistant";
import { Type } from "class-transformer";
import { IsIn, IsObject, ValidateNested } from "class-validator";
import { GenerateAssignmentDto } from "./generate-assignment.dto";

export class RegenerateSectionDto {
  @ValidateNested()
  @Type(() => GenerateAssignmentDto)
  input!: GenerateAssignmentDto;

  @IsIn([...ASSIGNMENT_SECTIONS])
  section!: AssignmentSection;

  @IsObject()
  existingAssignment!: Assignment;
}
