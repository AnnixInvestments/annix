import { RequiredString } from "../../lib/dto/validation-decorators";

export class RecruiterFindCandidatesDto {
  @RequiredString({ maxLength: 500 })
  query: string;
}
