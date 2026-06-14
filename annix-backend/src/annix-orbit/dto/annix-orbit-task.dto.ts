import {
  OptionalBoolean,
  OptionalInt,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export class CreateAnnixOrbitTaskDto {
  @RequiredString({ maxLength: 255 })
  title: string;

  @OptionalString({ maxLength: 30 })
  dueDate?: string | null;

  @OptionalBoolean()
  done?: boolean;

  @OptionalInt()
  relatedCandidateId?: number | null;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitTaskDto {
  @OptionalString({ maxLength: 255 })
  title?: string;

  @OptionalString({ maxLength: 30 })
  dueDate?: string | null;

  @OptionalBoolean()
  done?: boolean;

  @OptionalInt()
  relatedCandidateId?: number | null;

  @OptionalString()
  notes?: string | null;
}
