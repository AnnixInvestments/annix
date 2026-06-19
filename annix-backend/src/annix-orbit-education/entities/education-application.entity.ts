/**
 * A learner-tracked university application (#304 Phase 1). Learner-owned data —
 * the student records where they've applied and the status. `programmeId` links
 * to the curated catalog when known; otherwise the institution/programme names
 * are free-text so students can track applications we don't yet curate.
 */
export class EducationApplication {
  id: string;

  educationProfileId: string;

  programmeId: string | null;

  institutionName: string;

  programmeName: string;

  status: string;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
