import {
  AGE_BUCKETS,
  type AgeBucket,
  DIFFICULTY_LEVELS,
  type DifficultyLevel,
  SUBJECTS,
  type Subject,
} from "@annix/product-data/teacher-assistant";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class SuggestObjectivesDto {
  @IsIn([...SUBJECTS])
  subject!: Subject;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topic!: string;

  @IsIn([...AGE_BUCKETS])
  ageBucket!: AgeBucket;

  @IsIn([...DIFFICULTY_LEVELS])
  difficulty!: DifficultyLevel;
}
