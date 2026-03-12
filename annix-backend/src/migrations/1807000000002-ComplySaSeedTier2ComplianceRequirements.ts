import { MigrationInterface, QueryRunner } from "typeorm";

const REQUIREMENTS = [
  {
    code: "OHS_SAFETY_FILE",
    name: "Occupational Health & Safety File",
    description: "Occupational Health & Safety File",
    regulator: "Dept of Employment and Labour",
    category: "safety",
    frequency: "monthly",
    applicable_conditions: { has_payroll: true },
    deadline_rule: { type: "fixed_monthly", day: 1 },
    penalty_description: "R50,000 per contravention plus criminal prosecution",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Maintain physical safety file with all required documents",
      "Include OHS Act copy, safety policy, and health & safety plan",
      "Appoint H&S representatives (mandatory for 20+ employees)",
      "Review safety file at least monthly",
      "Update risk assessments annually",
      "Ensure first aid kits are stocked and accessible",
    ],
  },
  {
    code: "OHS_INCIDENT_REPORTING",
    name: "OHS Incident Reporting",
    description: "OHS Incident Reporting",
    regulator: "Dept of Employment and Labour",
    category: "safety",
    frequency: "ongoing",
    applicable_conditions: { has_payroll: true },
    deadline_rule: { type: "ongoing" },
    penalty_description: "Criminal prosecution, fines up to R50,000",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Report all incidents causing death or permanent disability immediately",
      "Report incidents causing 14+ days inability to work",
      "Maintain incident register on premises",
      "Investigate root cause of each incident",
      "Implement corrective actions",
    ],
  },
  {
    code: "BCEA_LEAVE_COMPLIANCE",
    name: "Basic Conditions of Employment - Leave",
    description: "Basic Conditions of Employment - Leave",
    regulator: "Dept of Employment and Labour",
    category: "labour",
    frequency: "ongoing",
    applicable_conditions: { has_payroll: true },
    deadline_rule: { type: "ongoing" },
    penalty_description: "Labour Court orders, fines",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Provide 21 consecutive days annual leave per cycle",
      "Allow 30 days sick leave per 3-year cycle",
      "Provide 3 days family responsibility leave per year",
      "Track maternity leave (4 consecutive months)",
      "Maintain accurate leave records for each employee",
    ],
  },
  {
    code: "BCEA_WORKING_HOURS",
    name: "Basic Conditions of Employment - Working Hours",
    description: "Basic Conditions of Employment - Working Hours",
    regulator: "Dept of Employment and Labour",
    category: "labour",
    frequency: "ongoing",
    applicable_conditions: { has_payroll: true },
    deadline_rule: { type: "ongoing" },
    penalty_description: "Compliance orders, fines",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Ensure ordinary hours do not exceed 45 per week",
      "Limit overtime to 10 hours per week",
      "Pay overtime at minimum 1.5x normal rate",
      "Pay Sunday/public holiday work at 2x normal rate",
      "Provide meal intervals of at least 1 hour after 5 hours work",
      "Keep time and attendance records for 3 years",
    ],
  },
  {
    code: "COIDA_GOOD_STANDING",
    name: "COIDA Letter of Good Standing",
    description: "COIDA Letter of Good Standing",
    regulator: "Dept of Employment and Labour",
    category: "labour",
    frequency: "annual",
    applicable_conditions: { has_payroll: true },
    deadline_rule: { type: "fixed_dates", dates: [{ month: 3, day: 31 }] },
    penalty_description: "Cannot tender for government contracts, no injury coverage",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Ensure Return of Earnings is submitted",
      "Pay all outstanding assessments",
      "Apply for Letter of Good Standing",
      "Keep letter on file for tender submissions",
      "Renew annually",
    ],
  },
  {
    code: "BBEE_CERTIFICATE_EXPIRY",
    name: "B-BBEE Certificate/Affidavit Expiry Tracking",
    description: "B-BBEE Certificate/Affidavit Expiry Tracking",
    regulator: "DTI",
    category: "corporate",
    frequency: "annual",
    applicable_conditions: null,
    deadline_rule: { type: "anniversary_offset", field: "registrationDate", offset_days: 365 },
    penalty_description: "Expired certificates invalidate tender submissions",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Note expiry date of current B-BBEE certificate/affidavit",
      "Begin renewal process 60 days before expiry",
      "Update ownership and management information",
      "Swear new affidavit or engage verification agency",
      "Distribute new certificate to procurement contacts",
    ],
  },
  {
    code: "SARS_TAX_CLEARANCE",
    name: "SARS Tax Clearance Certificate",
    description: "SARS Tax Clearance Certificate",
    regulator: "SARS",
    category: "tax",
    frequency: "ongoing",
    applicable_conditions: null,
    deadline_rule: { type: "ongoing" },
    penalty_description: "Cannot participate in government tenders",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Ensure all tax returns are filed and up to date",
      "Clear any outstanding tax debts or arrange payment plans",
      "Apply for Tax Compliance Status (TCS) pin on eFiling",
      "Verify TCS status is Active/Compliant",
      "Share TCS pin with procurement contacts as needed",
    ],
  },
  {
    code: "MUNICIPAL_BUSINESS_LICENCE",
    name: "Municipal Business Licence",
    description: "Municipal Business Licence",
    regulator: "Local Municipality",
    category: "municipal",
    frequency: "annual",
    applicable_conditions: null,
    deadline_rule: { type: "ongoing" },
    penalty_description: "Criminal offence, fines, closure orders",
    guidance_url: null,
    required_documents: null,
    checklist_steps: [
      "Confirm business premises has correct zoning",
      "Apply for business licence at local municipality",
      "Submit required documents (lease, floor plan, fire certificate)",
      "Pay licence fees",
      "Display licence prominently on premises",
      "Renew annually before expiry",
    ],
  },
];

export class ComplySaSeedTier2ComplianceRequirements1807000000002 implements MigrationInterface {
  name = "ComplySaSeedTier2ComplianceRequirements1807000000002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await Promise.all(
      REQUIREMENTS.map((req) =>
        queryRunner.query(
          `INSERT INTO comply_sa_compliance_requirements (
            code, name, description, regulator, category, frequency,
            applicable_conditions, deadline_rule, penalty_description,
            guidance_url, required_documents, checklist_steps, tier
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 2)
          ON CONFLICT (code) DO NOTHING`,
          [
            req.code,
            req.name,
            req.description,
            req.regulator,
            req.category,
            req.frequency,
            req.applicable_conditions !== null ? JSON.stringify(req.applicable_conditions) : null,
            req.deadline_rule !== null ? JSON.stringify(req.deadline_rule) : null,
            req.penalty_description,
            req.guidance_url,
            req.required_documents !== null ? JSON.stringify(req.required_documents) : null,
            req.checklist_steps !== null ? JSON.stringify(req.checklist_steps) : null,
          ],
        ),
      ),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const codes = REQUIREMENTS.map((r) => `'${r.code}'`).join(", ");
    await queryRunner.query(
      `DELETE FROM comply_sa_compliance_requirements WHERE code IN (${codes})`,
    );
  }
}
