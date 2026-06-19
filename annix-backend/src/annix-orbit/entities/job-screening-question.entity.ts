import { JobPosting } from "./job-posting.entity";

export enum ScreeningQuestionType {
  YES_NO = "yes_no",
  SHORT_TEXT = "short_text",
  MULTIPLE_CHOICE = "multiple_choice",
  NUMERIC = "numeric",
}

export class JobScreeningQuestion {
  id: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  question: string;

  questionType: ScreeningQuestionType;

  options: string[] | null;

  disqualifyingAnswer: string | null;

  weight: number;

  sortOrder: number;

  createdAt: Date;

  updatedAt: Date;
}
