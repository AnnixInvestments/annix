/**
 * A faculty within an institution. Holds an optional faculty-level default
 * requirement spec — the middle tier of the programme → faculty → institution
 * policy-inheritance chain (mirrors UCT faculty-specific FPS variants).
 */
export class EducationFaculty {
  id: string;

  institutionId: string;

  code: string;

  name: string;

  defaultRequirementSpec: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}
