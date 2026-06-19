/** A programme/degree a learner can be evaluated against (e.g. BSc Computer Science). */
export class EducationProgramme {
  id: string;

  institutionId: string;

  facultyId: string | null;

  code: string;

  name: string;

  /** Career cluster (see @annix/product-data/orbit-education). */
  careerCluster: string | null;

  createdAt: Date;

  updatedAt: Date;
}
