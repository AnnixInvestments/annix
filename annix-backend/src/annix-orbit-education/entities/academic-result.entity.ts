/** A single subject result on a learner's education profile. */
export class AcademicResult {
  id: string;

  educationProfileId: string;

  subject: string;

  mark: string | null;

  predictedMark: string | null;

  year: number | null;

  term: string | null;

  createdAt: Date;
}
