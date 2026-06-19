/**
 * A curated institution in the FuturePath admissions catalog (#308). Holds an
 * optional institution-level default requirement spec used as the last fallback
 * in the programme → faculty → institution policy-inheritance chain.
 */
export class EducationInstitution {
  id: string;

  code: string;

  name: string;

  country: string | null;

  /** Institution-level default RequirementSpec (jsonb) — fallback in the inheritance chain. */
  defaultRequirementSpec: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}
