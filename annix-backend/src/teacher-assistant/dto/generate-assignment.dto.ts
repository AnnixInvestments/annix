import {
  AGE_BUCKETS,
  type AgeBucket,
  DIFFERENTIATION_OPTIONS,
  DIFFICULTY_LEVELS,
  type DifferentiationOption,
  type DifficultyLevel,
  DURATIONS,
  type Duration,
  OUTPUT_TYPES,
  type OutputType,
  SUBJECTS,
  type Subject,
} from "@annix/product-data/teacher-assistant";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class GenerateAssignmentDto {
  @IsIn([...SUBJECTS])
  subject!: Subject;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topic!: string;

  @IsIn([...AGE_BUCKETS])
  ageBucket!: AgeBucket;

  @Type(() => Number)
  @IsInt()
  @Min(12)
  @Max(18)
  studentAge!: number;

  @IsIn([...DURATIONS])
  duration!: Duration;

  @IsIn([...OUTPUT_TYPES])
  outputType!: OutputType;

  @IsIn([...DIFFICULTY_LEVELS])
  difficulty!: DifficultyLevel;

  @IsArray()
  @IsIn([...DIFFERENTIATION_OPTIONS], { each: true })
  differentiation: DifferentiationOption[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  learningObjective?: string;

  @IsBoolean()
  allowAiUse!: boolean;
}
