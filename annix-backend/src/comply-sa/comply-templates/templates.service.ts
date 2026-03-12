import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateLongZA, formatDateZA, fromJSDate, now } from "../lib/datetime";

const SCORE_THRESHOLD_LOW = 50;
const SCORE_THRESHOLD_HIGH = 80;

const SCORE_COLOR_HIGH = "#4caf50";
const SCORE_COLOR_MEDIUM = "#ff9800";
const SCORE_COLOR_LOW = "#f44336";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredFields: string[];
}

export interface GeneratedTemplate {
  html: string;
}

const TEMPLATE_REGISTRY: TemplateMetadata[] = [
  {
    id: "popia_privacy_policy",
    name: "POPIA Privacy Policy",
    description:
      "Comprehensive privacy policy compliant with the Protection of Personal Information Act",
    category: "privacy",
    requiredFields: ["companyName", "informationOfficerName", "informationOfficerEmail", "address"],
  },
  {
    id: "popia_paia_manual",
    name: "PAIA Section 51 Manual",
    description: "Promotion of Access to Information Act manual for private bodies",
    category: "privacy",
    requiredFields: [
      "companyName",
      "registrationNumber",
      "address",
      "informationOfficerName",
      "informationOfficerEmail",
      "phone",
    ],
  },
  {
    id: "popia_breach_notification",
    name: "Data Breach Notification",
    description:
      "Notification template for reporting data breaches to the Information Regulator and affected data subjects",
    category: "privacy",
    requiredFields: [
      "companyName",
      "breachDate",
      "breachDescription",
      "dataAffected",
      "actionsTaken",
      "contactPerson",
      "contactEmail",
    ],
  },
  {
    id: "popia_io_appointment",
    name: "Information Officer Appointment Letter",
    description: "Formal appointment letter for the designated Information Officer under POPIA",
    category: "privacy",
    requiredFields: [
      "companyName",
      "officerName",
      "officerTitle",
      "appointmentDate",
      "directorName",
    ],
  },
  {
    id: "bbee_eme_affidavit",
    name: "EME Sworn Affidavit",
    description:
      "B-BBEE sworn affidavit for Exempted Micro Enterprises with turnover under R10 million",
    category: "bbee",
    requiredFields: [
      "companyName",
      "registrationNumber",
      "tradingName",
      "financialYearEnd",
      "annualTurnover",
      "blackOwnershipPercent",
      "deponentName",
      "deponentIdNumber",
      "date",
    ],
  },
  {
    id: "employment_contract_permanent",
    name: "Permanent Employment Contract",
    description:
      "Standard permanent employment contract compliant with the Basic Conditions of Employment Act",
    category: "labour",
    requiredFields: [
      "companyName",
      "employeeName",
      "employeeIdNumber",
      "position",
      "startDate",
      "salary",
      "workingHours",
      "leaveEntitlement",
      "noticePeriod",
    ],
  },
  {
    id: "ohs_safety_policy",
    name: "OHS Safety Policy",
    description: "Occupational Health and Safety policy document as required by the OHS Act",
    category: "safety",
    requiredFields: ["companyName", "managingDirector", "safetyOfficer", "address", "date"],
  },
  {
    id: "coida_roe_worksheet",
    name: "COIDA Return of Earnings Worksheet",
    description: "Worksheet for calculating and preparing the annual Return of Earnings submission",
    category: "labour",
    requiredFields: [
      "companyName",
      "registrationNumber",
      "assessmentYear",
      "totalEmployees",
      "totalEarnings",
    ],
  },
  {
    id: "compliance_health_report",
    name: "Compliance Health Report",
    description:
      "Comprehensive compliance health report with overall score, category breakdowns, and recommendations",
    category: "compliance",
    requiredFields: [],
  },
];

@Injectable()
export class ComplySaTemplatesService {
  constructor(
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
  ) {}

  availableTemplates(): TemplateMetadata[] {
    return TEMPLATE_REGISTRY;
  }

  generateTemplate(templateId: string, data: Record<string, string>): GeneratedTemplate {
    const template = TEMPLATE_REGISTRY.find((t) => t.id === templateId);

    if (template === undefined) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }

    const generators: Record<string, (d: Record<string, string>) => string> = {
      popia_privacy_policy: this.popiaPrivacyPolicy,
      popia_paia_manual: this.popiaPaiaManual,
      popia_breach_notification: this.popiaBreachNotification,
      popia_io_appointment: this.popiaIoAppointment,
      bbee_eme_affidavit: this.bbeeEmeAffidavit,
      employment_contract_permanent: this.employmentContractPermanent,
      ohs_safety_policy: this.ohsSafetyPolicy,
      coida_roe_worksheet: this.coidaRoeWorksheet,
    };

    const generator = generators[templateId];

    if (generator === undefined) {
      throw new NotFoundException(`Generator for "${templateId}" not found`);
    }

    return { html: generator(data) };
  }

  async generateHealthReport(companyId: number): Promise<GeneratedTemplate> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const statuses = await this.statusRepository.find({
      where: { companyId },
      relations: ["requirement"],
    });

    const totalCount = statuses.length;
    const compliantCount = statuses.filter((s) => s.status === "compliant").length;
    const inProgressCount = statuses.filter((s) => s.status === "in_progress").length;
    const nonCompliantCount = statuses.filter((s) => s.status === "non_compliant").length;
    const overallScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const scoreColor = (() => {
      if (overallScore >= SCORE_THRESHOLD_HIGH) {
        return SCORE_COLOR_HIGH;
      } else if (overallScore >= SCORE_THRESHOLD_LOW) {
        return SCORE_COLOR_MEDIUM;
      } else {
        return SCORE_COLOR_LOW;
      }
    })();

    const groupedByCategory = statuses.reduce(
      (acc, status) => {
        const category = status.requirement?.category ?? "Uncategorised";
        const existing = acc[category] ?? [];
        return { ...acc, [category]: [...existing, status] };
      },
      {} as Record<string, ComplySaComplianceStatus[]>,
    );

    const categorySections = Object.entries(groupedByCategory)
      .map(([category, items]) => {
        const rows = items
          .map((item) => {
            const statusColor = (() => {
              if (item.status === "compliant") {
                return SCORE_COLOR_HIGH;
              } else if (item.status === "in_progress") {
                return SCORE_COLOR_MEDIUM;
              } else {
                return SCORE_COLOR_LOW;
              }
            })();

            return `<tr>
              <td>${item.requirement?.name ?? "Unknown"}</td>
              <td style="color:${statusColor};font-weight:bold">${item.status.replace("_", " ").toUpperCase()}</td>
              <td>${item.nextDueDate !== null ? formatDateZA(fromJSDate(item.nextDueDate)) : "N/A"}</td>
              <td>${item.notes ?? ""}</td>
            </tr>`;
          })
          .join("\n");

        const categoryCompliant = items.filter((i) => i.status === "compliant").length;
        const categoryTotal = items.length;
        const categoryScore =
          categoryTotal > 0 ? Math.round((categoryCompliant / categoryTotal) * 100) : 0;

        return `<h2>${category} (${categoryScore}%)</h2>
          <table>
            <tr><th>Requirement</th><th>Status</th><th>Next Due</th><th>Notes</th></tr>
            ${rows}
          </table>`;
      })
      .join("\n");

    const upcomingDeadlines = statuses
      .filter((s) => s.nextDueDate !== null && s.status !== "compliant")
      .sort((a, b) => (a.nextDueDate?.getTime() ?? 0) - (b.nextDueDate?.getTime() ?? 0))
      .slice(0, 10)
      .map(
        (s) =>
          `<li><strong>${s.requirement?.name ?? "Unknown"}</strong> — due ${s.nextDueDate !== null ? formatDateZA(fromJSDate(s.nextDueDate)) : "TBD"}</li>`,
      )
      .join("\n");

    const recommendations = statuses
      .filter((s) => s.status !== "compliant")
      .map(
        (s) =>
          `<li>Address <strong>${s.requirement?.name ?? "Unknown"}</strong> (${s.requirement?.category ?? "general"}) — currently ${s.status.replace("_", " ")}</li>`,
      )
      .join("\n");

    const reportDate = formatDateLongZA(now());

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Compliance Health Report - ${company.name}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.6}h1{color:#1a365d}h2{color:#2d3748;border-bottom:1px solid #e2e8f0;padding-bottom:8px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #e2e8f0;padding:10px;text-align:left}th{background:#f7fafc}.score{font-size:48px;font-weight:bold;text-align:center;padding:20px;border-radius:8px;margin:20px 0}.summary{display:flex;gap:20px;margin:20px 0}.summary-card{flex:1;padding:20px;border-radius:8px;text-align:center;color:#fff}.summary-card h3{margin:0;font-size:14px;opacity:0.9}.summary-card p{margin:5px 0 0;font-size:28px;font-weight:bold}</style></head>
<body>
<h1>Compliance Health Report</h1>
<h2>${company.name}</h2>
<p>Generated: ${reportDate}</p>
${company.registrationNumber !== null ? `<p>Registration: ${company.registrationNumber}</p>` : ""}

<div class="score" style="background:${scoreColor};color:#fff">
  Overall Score: ${overallScore}%
</div>

<div class="summary">
  <div class="summary-card" style="background:#4caf50"><h3>Compliant</h3><p>${compliantCount}</p></div>
  <div class="summary-card" style="background:#ff9800"><h3>In Progress</h3><p>${inProgressCount}</p></div>
  <div class="summary-card" style="background:#f44336"><h3>Non-Compliant</h3><p>${nonCompliantCount}</p></div>
  <div class="summary-card" style="background:#2196f3"><h3>Total</h3><p>${totalCount}</p></div>
</div>

<h2>Category Breakdown</h2>
${categorySections}

${upcomingDeadlines.length > 0 ? `<h2>Upcoming Deadlines</h2><ul>${upcomingDeadlines}</ul>` : ""}

${recommendations.length > 0 ? `<h2>Recommendations</h2><ul>${recommendations}</ul>` : "<h2>Recommendations</h2><p>All requirements are compliant. Well done!</p>"}

<hr>
<p style="color:#718096;font-size:12px">This report was automatically generated by Annix Compliance. It reflects the compliance status as at ${reportDate}.</p>
</body></html>`;

    return { html };
  }

  private popiaPrivacyPolicy(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const officerName = data["informationOfficerName"];
    const officerEmail = data["informationOfficerEmail"];
    const address = data["address"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Privacy Policy - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .section-number { font-weight: bold; margin-right: 8px; }
  .defined-term { font-weight: bold; }
  .effective-date { text-align: center; font-style: italic; margin-bottom: 30px; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  .signature-block { margin-top: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Privacy Policy</h1>
<h2>${companyName}</h2>
<p class="effective-date">Prepared in terms of the Protection of Personal Information Act 4 of 2013 ("POPIA")</p>

<h3><span class="section-number">1.</span> Purpose</h3>
<p>${companyName} ("the Company", "we", "us", "our") is committed to protecting the privacy and personal information of all individuals who interact with us. This Privacy Policy explains how we collect, use, store, share, and protect personal information in compliance with the Protection of Personal Information Act 4 of 2013 ("POPIA") and its regulations.</p>

<h3><span class="section-number">2.</span> Definitions</h3>
<p>In this Privacy Policy, the following terms shall have the meanings ascribed to them:</p>
<ul>
  <li><span class="defined-term">"Data Subject"</span> means the person to whom personal information relates, including but not limited to customers, employees, suppliers, and service providers;</li>
  <li><span class="defined-term">"Personal Information"</span> means information relating to an identifiable, living, natural person, and where applicable, an identifiable, existing juristic person as defined in section 1 of POPIA;</li>
  <li><span class="defined-term">"Processing"</span> means any operation or activity, whether automated or not, concerning personal information, including collection, receipt, recording, organisation, storage, updating, retrieval, consultation, use, dissemination, merging, restriction, degradation, erasure, or destruction;</li>
  <li><span class="defined-term">"Responsible Party"</span> means ${companyName}, which determines the purpose of and means for processing personal information;</li>
  <li><span class="defined-term">"Information Officer"</span> means the person designated by the Company to fulfil the duties prescribed in sections 55 and 56 of POPIA;</li>
  <li><span class="defined-term">"Operator"</span> means a person who processes personal information on behalf of the Responsible Party under a contract or mandate;</li>
  <li><span class="defined-term">"Information Regulator"</span> means the body established under section 39 of POPIA to monitor and enforce compliance.</li>
</ul>

<h3><span class="section-number">3.</span> Personal Information Collected</h3>
<p>The Company may collect and process the following categories of personal information:</p>
<ul>
  <li>Identity and contact details (full name, identity/passport number, date of birth, physical and postal address, email address, telephone numbers);</li>
  <li>Demographic information (gender, race, age, language preference);</li>
  <li>Financial information (bank account details, tax number, payment records);</li>
  <li>Employment information (job title, employer details, work history, qualifications);</li>
  <li>Technical information (IP address, browser type, device identifiers, cookies and usage data when interacting with our digital platforms);</li>
  <li>Communication records (correspondence, feedback, complaints, call recordings where applicable);</li>
  <li>Any other information voluntarily provided by the Data Subject in the course of engaging with the Company.</li>
</ul>

<h3><span class="section-number">4.</span> Purposes of Processing</h3>
<p>Personal information is processed for the following lawful purposes:</p>
<ul>
  <li>To provide and manage the products and services requested by the Data Subject;</li>
  <li>To communicate with Data Subjects regarding their accounts, orders, enquiries, or complaints;</li>
  <li>To comply with legal and regulatory obligations, including those imposed by SARS, CIPC, and sector-specific regulators;</li>
  <li>To manage our employment relationships, including recruitment, payroll, and statutory reporting;</li>
  <li>To conduct internal audits, risk management, and fraud prevention;</li>
  <li>To improve our products, services, and internal processes;</li>
  <li>To fulfil contractual obligations with customers, suppliers, and business partners;</li>
  <li>To pursue the legitimate interests of the Company, provided such interests do not prejudice the rights of Data Subjects.</li>
</ul>

<h3><span class="section-number">5.</span> Legal Basis for Processing</h3>
<p>The Company processes personal information on one or more of the following grounds as set out in section 11 of POPIA:</p>
<ul>
  <li>The Data Subject has consented to the processing;</li>
  <li>Processing is necessary for the performance of a contract;</li>
  <li>Processing is required to comply with a legal obligation;</li>
  <li>Processing protects the legitimate interest of the Data Subject;</li>
  <li>Processing is necessary for the pursuit of the legitimate interests of the Company or a third party.</li>
</ul>

<h3><span class="section-number">6.</span> Rights of Data Subjects</h3>
<p>In terms of POPIA, Data Subjects have the following rights:</p>
<ul>
  <li>The right to be informed that personal information is being collected (section 18);</li>
  <li>The right to access personal information held by the Company (section 23);</li>
  <li>The right to request correction or deletion of personal information (section 24);</li>
  <li>The right to object to the processing of personal information (section 11(3)(a));</li>
  <li>The right to object to processing for purposes of direct marketing by unsolicited electronic communications (section 69);</li>
  <li>The right to complain to the Information Regulator regarding any alleged interference with the protection of personal information (section 74);</li>
  <li>The right to institute civil proceedings regarding any alleged interference with the protection of personal information (section 99).</li>
</ul>
<p>To exercise any of these rights, the Data Subject must submit a written request to the Information Officer using the contact details provided below.</p>

<h3><span class="section-number">7.</span> Security Measures</h3>
<p>The Company is committed to ensuring that personal information is appropriately secured. In terms of section 19 of POPIA, we implement the following measures:</p>
<ul>
  <li>Access controls and authentication mechanisms to restrict access to authorised personnel;</li>
  <li>Encryption of personal information during storage and transmission where appropriate;</li>
  <li>Regular security assessments and vulnerability testing;</li>
  <li>Secure disposal and destruction of records containing personal information;</li>
  <li>Confidentiality agreements with employees, contractors, and Operators who access personal information;</li>
  <li>Incident response procedures to address data breaches promptly.</li>
</ul>

<h3><span class="section-number">8.</span> Retention of Personal Information</h3>
<p>Personal information will be retained only for as long as is necessary to fulfil the purpose for which it was collected, or as required by applicable legislation. Records will be destroyed, deleted, or de-identified in a manner that prevents reconstruction once the retention period has expired, in accordance with section 14 of POPIA.</p>

<h3><span class="section-number">9.</span> Sharing and Transfer of Personal Information</h3>
<p>The Company may share personal information with third parties where necessary, including service providers, regulatory bodies, and professional advisors. Where personal information is transferred to an Operator or to a recipient in another country, the Company will ensure that adequate safeguards are in place as required by sections 72 and 76 of POPIA.</p>

<h3><span class="section-number">10.</span> Information Officer</h3>
<p>The designated Information Officer of ${companyName} is:</p>
<ul>
  <li><span class="defined-term">Name:</span> ${officerName}</li>
  <li><span class="defined-term">Email:</span> ${officerEmail}</li>
  <li><span class="defined-term">Address:</span> ${address}</li>
</ul>

<h3><span class="section-number">11.</span> Complaints Procedure</h3>
<p>If a Data Subject believes that the Company has not complied with POPIA, the Data Subject may:</p>
<ul>
  <li>Lodge a written complaint with the Information Officer at the contact details above;</li>
  <li>The Information Officer will investigate and respond within 30 days of receipt;</li>
  <li>If the Data Subject is not satisfied with the outcome, the Data Subject may lodge a complaint with the Information Regulator:
    <ul>
      <li>Email: inforeg@justice.gov.za</li>
      <li>Website: www.justice.gov.za/inforeg</li>
      <li>Tel: 012 406 4818</li>
    </ul>
  </li>
</ul>

<h3><span class="section-number">12.</span> Amendments</h3>
<p>The Company reserves the right to amend this Privacy Policy from time to time. Any material changes will be communicated to Data Subjects through appropriate channels. The most current version of this policy will always be available upon request from the Information Officer.</p>

<div class="signature-block">
  <p><strong>Authorised by:</strong></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: <span class="signature-line" style="width:150px">&nbsp;</span></p>
  <p class="signature-label">Designation: ___________________________</p>
</div>

<div class="footer">
  <p>This Privacy Policy is issued in terms of the Protection of Personal Information Act 4 of 2013.</p>
  <p>${companyName} &bull; ${address}</p>
</div>

</body>
</html>`;
  }

  private popiaPaiaManual(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const regNumber = data["registrationNumber"];
    const address = data["address"];
    const officerName = data["informationOfficerName"];
    const officerEmail = data["informationOfficerEmail"];
    const phone = data["phone"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PAIA Section 51 Manual - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 35%; font-weight: bold; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  .signature-block { margin-top: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; }
  ul, ol { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Section 51 Manual</h1>
<h2>Promotion of Access to Information Act 2 of 2000</h2>
<h2>${companyName}</h2>

<h3>1. Introduction</h3>
<p>This manual is published in terms of <span class="defined-term">section 51</span> of the Promotion of Access to Information Act 2 of 2000 ("PAIA"), as amended by the Protection of Personal Information Act 4 of 2013 ("POPIA"). The purpose of this manual is to inform the public of the categories of records held by ${companyName} and the procedure to follow when requesting access to such records.</p>
<p>PAIA grants any person the right to request access to records held by a private body, provided such access is required for the exercise or protection of any right, and subject to the applicable grounds of refusal set out in the Act.</p>

<h3>2. Contact Details of the Private Body</h3>
<table class="detail-table">
  <tr><th>Registered Name</th><td>${companyName}</td></tr>
  <tr><th>Registration Number</th><td>${regNumber}</td></tr>
  <tr><th>Physical Address</th><td>${address}</td></tr>
  <tr><th>Telephone</th><td>${phone}</td></tr>
</table>

<h3>3. Information Officer</h3>
<table class="detail-table">
  <tr><th>Name</th><td>${officerName}</td></tr>
  <tr><th>Email</th><td>${officerEmail}</td></tr>
  <tr><th>Telephone</th><td>${phone}</td></tr>
  <tr><th>Address</th><td>${address}</td></tr>
</table>

<h3>4. Guide Published by the South African Human Rights Commission</h3>
<p>The South African Human Rights Commission ("SAHRC") has, in terms of section 10 of PAIA, compiled a guide to assist persons wishing to exercise their right to access information held by public and private bodies. This guide is available from the SAHRC:</p>
<ul>
  <li>Website: www.sahrc.org.za</li>
  <li>Tel: 011 877 3600</li>
  <li>Email: info@sahrc.org.za</li>
</ul>

<h3>5. Records Available in Terms of Other Legislation</h3>
<p>${companyName} holds records in terms of, but not limited to, the following legislation:</p>
<ul>
  <li>Companies Act 71 of 2008</li>
  <li>Basic Conditions of Employment Act 75 of 1997</li>
  <li>Labour Relations Act 66 of 1995</li>
  <li>Employment Equity Act 55 of 1998</li>
  <li>Income Tax Act 58 of 1962</li>
  <li>Value-Added Tax Act 89 of 1991</li>
  <li>Unemployment Insurance Act 63 of 2001</li>
  <li>Compensation for Occupational Injuries and Diseases Act 130 of 1993</li>
  <li>Occupational Health and Safety Act 85 of 1993</li>
  <li>Skills Development Act 97 of 1998</li>
  <li>Skills Development Levies Act 9 of 1999</li>
  <li>Electronic Communications and Transactions Act 25 of 2002</li>
  <li>Broad-Based Black Economic Empowerment Act 53 of 2003</li>
  <li>Protection of Personal Information Act 4 of 2013</li>
</ul>

<h3>6. Categories of Records Held</h3>
<p>The following categories of records are held by ${companyName}:</p>
<p><span class="defined-term">6.1 Company Records:</span> Memorandum of Incorporation, shareholder agreements, minutes of meetings, annual returns, CIPC correspondence.</p>
<p><span class="defined-term">6.2 Financial Records:</span> Annual financial statements, tax returns, banking records, invoices, asset registers, audit reports.</p>
<p><span class="defined-term">6.3 Human Resources Records:</span> Employment contracts, payroll records, disciplinary records, leave records, training records, employee personal information.</p>
<p><span class="defined-term">6.4 Customer Records:</span> Contracts, correspondence, account information, delivery records, quotations.</p>
<p><span class="defined-term">6.5 Supplier Records:</span> Contracts, purchase orders, invoices, B-BBEE certificates, tax clearance certificates.</p>
<p><span class="defined-term">6.6 Operational Records:</span> Policies and procedures, operational reports, project documentation, intellectual property records.</p>
<p><span class="defined-term">6.7 Safety Records:</span> OHS records, risk assessments, incident reports, safety training records.</p>

<h3>7. Request Procedure</h3>
<p>A request for access to records must be made on the prescribed form (Form C) as set out in Annexure B of the Regulations published under PAIA. The form must be submitted to the Information Officer at the contact details provided above.</p>
<p>The requester must:</p>
<ol>
  <li>Complete Form C in full, identifying the record(s) requested and the form of access required;</li>
  <li>Provide sufficient detail to enable the Information Officer to identify the record(s);</li>
  <li>Indicate which right is being exercised or protected, and the reason why the record is required for the exercise or protection of that right;</li>
  <li>Indicate the preferred form of access (inspection, copy, etc.);</li>
  <li>Pay the prescribed request fee (if applicable).</li>
</ol>
<p>The Information Officer will process the request within <span class="defined-term">30 days</span> of receipt, which period may be extended by a further 30 days if the request requires a search through a large volume of records or consultation with a third party.</p>

<h3>8. Prescribed Fees</h3>
<p>The following fees are payable in terms of the Regulations:</p>
<table class="detail-table">
  <tr><th>Fee Type</th><th>Description</th></tr>
  <tr><td>Request Fee</td><td>A non-refundable fee payable by all requesters, other than personal requesters seeking access to their own personal information (currently R50.00)</td></tr>
  <tr><td>Access Fee</td><td>Payable once the request is granted, calculated according to the prescribed tariff based on the form of access and volume of records</td></tr>
  <tr><td>Deposit</td><td>One-third of the access fee may be required as a deposit where the cost of searching for and preparing the record exceeds the prescribed threshold (currently six hours)</td></tr>
</table>

<h3>9. Grounds for Refusal</h3>
<p>The Information Officer may refuse access to records on the grounds set out in Chapter 4, Part 3 of PAIA, including but not limited to:</p>
<ul>
  <li>Protection of the privacy of a third party (section 63);</li>
  <li>Protection of commercial information of a third party or the private body (sections 64 and 68);</li>
  <li>Protection of confidential information (section 65);</li>
  <li>Mandatory protection of safety of individuals or property (section 66);</li>
  <li>Records which are privileged from production in legal proceedings (section 67);</li>
  <li>Protection of research information (section 69).</li>
</ul>

<h3>10. Remedies</h3>
<p>A requester who is aggrieved by the decision of the Information Officer may, within 180 days of notification of the decision:</p>
<ol>
  <li>Lodge a complaint with the Information Regulator (inforeg@justice.gov.za); or</li>
  <li>Apply to a court of competent jurisdiction for appropriate relief as contemplated in section 78 of PAIA.</li>
</ol>

<h3>11. Processing of Personal Information</h3>
<p>In terms of section 51(1)(c) of PAIA, as introduced by POPIA, ${companyName} processes personal information in accordance with its Privacy Policy, which sets out the purpose for which personal information is processed, the categories of Data Subjects, the recipients of personal information, and cross-border transfers.</p>

<h3>12. Availability of This Manual</h3>
<p>This manual is available:</p>
<ul>
  <li>On request from the Information Officer at the above contact details;</li>
  <li>At the premises of ${companyName} during normal business hours;</li>
  <li>On the website of the Information Regulator (www.justice.gov.za/inforeg).</li>
</ul>

<div class="signature-block">
  <p><strong>Signed:</strong></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Information Officer: ${officerName}</p>
  <p class="signature-label">Date: <span class="signature-line" style="width:150px">&nbsp;</span></p>
</div>

<div class="footer">
  <p>This manual is published in terms of section 51 of the Promotion of Access to Information Act 2 of 2000.</p>
  <p>${companyName} &bull; Registration No. ${regNumber} &bull; ${address}</p>
</div>

</body>
</html>`;
  }

  private popiaBreachNotification(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const breachDate = data["breachDate"];
    const breachDescription = data["breachDescription"];
    const dataAffected = data["dataAffected"];
    const actionsTaken = data["actionsTaken"];
    const contactPerson = data["contactPerson"];
    const contactEmail = data["contactEmail"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Data Breach Notification - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #b91c1c; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .urgent-banner { background: #fef2f2; border: 2px solid #b91c1c; border-radius: 4px; padding: 15px 20px; text-align: center; color: #b91c1c; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 35%; font-weight: bold; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  .signature-block { margin-top: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Data Breach Notification</h1>
<h2>In terms of Section 22 of the Protection of Personal Information Act 4 of 2013</h2>

<div class="urgent-banner">URGENT &mdash; SECURITY COMPROMISE OF PERSONAL INFORMATION</div>

<h3>1. Responsible Party</h3>
<table class="detail-table">
  <tr><th>Organisation</th><td>${companyName}</td></tr>
  <tr><th>Contact Person</th><td>${contactPerson}</td></tr>
  <tr><th>Contact Email</th><td>${contactEmail}</td></tr>
</table>

<h3>2. Date and Discovery of the Breach</h3>
<p>Date of the security compromise: <span class="defined-term">${breachDate}</span></p>
<p>This notification is issued in terms of section 22(1) of POPIA, which requires a responsible party to notify the Information Regulator and affected data subjects as soon as reasonably possible after the discovery of a security compromise involving personal information.</p>

<h3>3. Description of the Breach</h3>
<p>${breachDescription}</p>

<h3>4. Personal Information Affected</h3>
<p>The following categories of personal information have been, or are reasonably believed to have been, affected by this compromise:</p>
<p>${dataAffected}</p>

<h3>5. Possible Consequences of the Breach</h3>
<p>The unauthorised access to or disclosure of the personal information described above may result in one or more of the following consequences for affected data subjects:</p>
<ul>
  <li>Identity theft or fraud;</li>
  <li>Financial loss or unauthorised transactions;</li>
  <li>Reputational harm;</li>
  <li>Discrimination or prejudice;</li>
  <li>Unsolicited communications or phishing attempts.</li>
</ul>

<h3>6. Remedial Actions Taken</h3>
<p>${companyName} has taken the following steps to address the security compromise and mitigate its consequences:</p>
<p>${actionsTaken}</p>

<h3>7. Recommended Steps for Affected Data Subjects</h3>
<p>Affected data subjects are advised to take the following precautionary steps:</p>
<ul>
  <li>Monitor bank accounts and financial statements for any suspicious or unauthorised activity;</li>
  <li>Change passwords for any accounts that may be linked to the affected personal information;</li>
  <li>Enable two-factor authentication where available;</li>
  <li>Be alert to unsolicited communications requesting personal information, and do not respond to suspected phishing attempts;</li>
  <li>Consider placing a fraud alert with the Southern African Fraud Prevention Service (SAFPS) at www.safps.org.za;</li>
  <li>Contact the Company at the details below if you suspect that your personal information has been misused.</li>
</ul>

<h3>8. Contact Information</h3>
<p>For further information regarding this notification, please contact:</p>
<table class="detail-table">
  <tr><th>Name</th><td>${contactPerson}</td></tr>
  <tr><th>Email</th><td>${contactEmail}</td></tr>
  <tr><th>Organisation</th><td>${companyName}</td></tr>
</table>

<h3>9. Information Regulator</h3>
<p>This notification has been submitted to the Information Regulator in terms of section 22(2) of POPIA. Affected data subjects may also lodge a complaint directly with the Information Regulator:</p>
<ul>
  <li>Email: inforeg@justice.gov.za</li>
  <li>Tel: 012 406 4818</li>
  <li>Website: www.justice.gov.za/inforeg</li>
</ul>

<h3>10. Regulatory References</h3>
<p>This notification is issued in compliance with the following provisions of the Protection of Personal Information Act 4 of 2013:</p>
<ul>
  <li><span class="defined-term">Section 19:</span> Security measures on integrity and confidentiality of personal information;</li>
  <li><span class="defined-term">Section 22(1):</span> Notification of security compromises to the Information Regulator and data subjects;</li>
  <li><span class="defined-term">Section 22(3):</span> Contents of notification to data subjects;</li>
  <li><span class="defined-term">Section 22(4):</span> Delay of notification where criminal investigation may be impeded;</li>
  <li><span class="defined-term">Section 100:</span> Offences relating to obstruction or failure to comply with the Act.</li>
</ul>

<div class="signature-block">
  <p><strong>Issued by:</strong></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Name: ${contactPerson}</p>
  <p class="signature-label">Designation: ___________________________</p>
  <p class="signature-label">Date: <span class="signature-line" style="width:150px">&nbsp;</span></p>
</div>

<div class="footer">
  <p>This notification is issued in terms of section 22 of the Protection of Personal Information Act 4 of 2013.</p>
  <p>${companyName}</p>
</div>

</body>
</html>`;
  }

  private popiaIoAppointment(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const officerName = data["officerName"];
    const officerTitle = data["officerTitle"];
    const appointmentDate = data["appointmentDate"];
    const directorName = data["directorName"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Appointment of Information Officer - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 16px; color: #1a365d; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .letterhead { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 20px; margin-bottom: 30px; }
  .letterhead .company-name { font-size: 24px; font-weight: bold; color: #1a365d; letter-spacing: 3px; text-transform: uppercase; }
  .defined-term { font-weight: bold; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 35%; font-weight: bold; }
  .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-col { width: 45%; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 100%; display: block; margin-bottom: 5px; height: 30px; }
  .signature-label { font-size: 11px; color: #4a5568; margin: 3px 0; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } .signature-block { display: block; } .signature-col { width: 100%; margin-bottom: 40px; } }
</style>
</head>
<body>

<div class="letterhead">
  <div class="company-name">${companyName}</div>
</div>

<h1>Appointment of Information Officer</h1>
<h2>In terms of the Protection of Personal Information Act 4 of 2013</h2>

<p>Date: <span class="defined-term">${appointmentDate}</span></p>

<p>Dear <span class="defined-term">${officerName}</span>,</p>

<h3>1. Appointment</h3>
<p>In terms of <span class="defined-term">section 55</span> of the Protection of Personal Information Act 4 of 2013 ("POPIA"), the head of ${companyName} ("the Company") hereby designates and appoints you as the <span class="defined-term">Information Officer</span> of the Company, with effect from <span class="defined-term">${appointmentDate}</span>.</p>

<h3>2. Appointee Details</h3>
<table class="detail-table">
  <tr><th>Full Name</th><td>${officerName}</td></tr>
  <tr><th>Title / Designation</th><td>${officerTitle}</td></tr>
  <tr><th>Effective Date</th><td>${appointmentDate}</td></tr>
</table>

<h3>3. Duties and Responsibilities</h3>
<p>As Information Officer, you are required to fulfil the following duties in terms of POPIA and PAIA:</p>
<ul>
  <li>Encourage compliance by the Company with the conditions for the lawful processing of personal information as set out in Chapter 3 of POPIA;</li>
  <li>Deal with requests made to the Company in terms of POPIA and PAIA;</li>
  <li>Work with the Information Regulator in relation to investigations conducted in terms of Chapter 6 of POPIA;</li>
  <li>Ensure that a compliance framework is developed, implemented, monitored, and maintained;</li>
  <li>Ensure that internal awareness sessions are conducted regarding the provisions of POPIA and the Company's obligations;</li>
  <li>Ensure that internal measures are in place together with adequate systems to process requests for information or access as prescribed;</li>
  <li>Compile and maintain the PAIA Section 51 Manual as required by section 51 of PAIA;</li>
  <li>Register with the Information Regulator in terms of section 55(1) of POPIA;</li>
  <li>Notify the Information Regulator and affected data subjects of any security compromises in terms of section 22 of POPIA;</li>
  <li>Conduct or oversee impact assessments where necessary before processing personal information;</li>
  <li>Serve as the point of contact between the Company and the Information Regulator.</li>
</ul>

<h3>4. Authority</h3>
<p>In the performance of these duties, you are authorised to access all records, systems, and processes of the Company that are necessary for the fulfilment of your responsibilities. You shall report directly to the head of the Company on all matters relating to the processing of personal information and compliance with POPIA.</p>

<h3>5. Duration</h3>
<p>This appointment shall remain in force until revoked in writing by the head of the Company, or until you cease to hold the position of ${officerTitle} within the Company, whichever occurs first.</p>

<h3>6. Acceptance</h3>
<p>By signing below, you confirm that you understand and accept the responsibilities set out in this letter of appointment and undertake to discharge your duties diligently and in accordance with the provisions of POPIA and PAIA.</p>

<div class="signature-block">
  <div class="signature-col">
    <p class="defined-term">For and on behalf of ${companyName}:</p>
    <span class="signature-line">&nbsp;</span>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ${directorName}</p>
    <p class="signature-label">Designation: Director / Head of Body</p>
    <p class="signature-label">Date: ___________________________</p>
  </div>
  <div class="signature-col">
    <p class="defined-term">Accepted by the Information Officer:</p>
    <span class="signature-line">&nbsp;</span>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ${officerName}</p>
    <p class="signature-label">Designation: ${officerTitle}</p>
    <p class="signature-label">Date: ___________________________</p>
  </div>
</div>

<div class="footer">
  <p>This appointment is made in terms of sections 55 and 56 of the Protection of Personal Information Act 4 of 2013.</p>
  <p>${companyName}</p>
</div>

</body>
</html>`;
  }

  private bbeeEmeAffidavit(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const regNumber = data["registrationNumber"];
    const tradingName = data["tradingName"];
    const financialYearEnd = data["financialYearEnd"];
    const annualTurnover = data["annualTurnover"];
    const blackOwnershipPercent = data["blackOwnershipPercent"];
    const deponentName = data["deponentName"];
    const deponentIdNumber = data["deponentIdNumber"];
    const affidavitDate = data["date"];
    const blackOwnershipNum = parseFloat(blackOwnershipPercent) || 0;
    const bbbeeLevel = blackOwnershipNum >= 51 ? "Level 1 (135% B-BBEE recognition)" : "Level 2 (125% B-BBEE recognition)";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>B-BBEE EME Sworn Affidavit - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 25px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 40%; font-weight: bold; }
  .declaration-box { border: 2px solid #1a365d; padding: 20px; margin: 20px 0; background: #f7fafc; }
  .signature-block { margin-top: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; margin: 3px 0; }
  .commissioner-block { margin-top: 50px; border: 1px solid #cbd5e0; padding: 20px; background: #fafafa; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  ol { margin: 8px 0 8px 20px; }
  li { margin: 6px 0; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Sworn Affidavit</h1>
<h2>B-BBEE Exempted Micro Enterprise (EME)</h2>
<h2>In terms of the Broad-Based Black Economic Empowerment Act 53 of 2003, as amended</h2>

<h3>Enterprise Details</h3>
<table class="detail-table">
  <tr><th>Registered Name</th><td>${companyName}</td></tr>
  <tr><th>Registration Number</th><td>${regNumber}</td></tr>
  <tr><th>Trading Name</th><td>${tradingName}</td></tr>
  <tr><th>Financial Year End</th><td>${financialYearEnd}</td></tr>
  <tr><th>Total Annual Turnover</th><td>R ${annualTurnover}</td></tr>
  <tr><th>Percentage Black Ownership</th><td>${blackOwnershipPercent}%</td></tr>
  <tr><th>B-BBEE Status</th><td>${bbbeeLevel}</td></tr>
</table>

<h3>Deponent Details</h3>
<table class="detail-table">
  <tr><th>Full Name</th><td>${deponentName}</td></tr>
  <tr><th>Identity Number</th><td>${deponentIdNumber}</td></tr>
  <tr><th>Date of Affidavit</th><td>${affidavitDate}</td></tr>
</table>

<div class="declaration-box">
<h3>Declaration Under Oath</h3>

<p>I, the undersigned, <span class="defined-term">${deponentName}</span>, identity number <span class="defined-term">${deponentIdNumber}</span>, do hereby make oath and declare that:</p>

<ol>
  <li>I am a duly authorised representative of <span class="defined-term">${companyName}</span> (registration number ${regNumber}), trading as <span class="defined-term">${tradingName}</span>.</li>

  <li>The enterprise's total annual turnover for the financial year ending <span class="defined-term">${financialYearEnd}</span> was <span class="defined-term">R ${annualTurnover}</span>, which is below the R10 million threshold prescribed for Exempted Micro Enterprises in terms of the Broad-Based Black Economic Empowerment Act 53 of 2003 ("the Act"), as amended, read with the Codes of Good Practice issued thereunder (Government Gazette No. 36928 dated 11 October 2013, as amended by Government Gazette No. 42496 dated 31 May 2019).</li>

  <li>The enterprise therefore qualifies as an <span class="defined-term">Exempted Micro Enterprise (EME)</span> and is not required to obtain a B-BBEE verification certificate from a verification agency.</li>

  <li>The percentage of black ownership (as defined in the Act and the Codes) in the enterprise is <span class="defined-term">${blackOwnershipPercent}%</span>.</li>

  <li>In terms of the Amended Codes of Good Practice:
    <ul>
      <li>An EME with at least 51% black ownership qualifies as a <span class="defined-term">Level 1 B-BBEE contributor</span> with a B-BBEE recognition level of 135%;</li>
      <li>An EME with at least 100% black ownership qualifies as a <span class="defined-term">Level 1 B-BBEE contributor</span> with a B-BBEE recognition level of 135%;</li>
      <li>All other EMEs qualify as a <span class="defined-term">Level 2 B-BBEE contributor</span> with a B-BBEE recognition level of 125%.</li>
    </ul>
  </li>

  <li>I confirm that the information furnished in this affidavit is true and correct to the best of my knowledge and belief.</li>

  <li>I understand that this affidavit may be used by third parties for purposes of assessing the B-BBEE status of the enterprise and that any misrepresentation constitutes a criminal offence in terms of the Act.</li>

  <li>I understand that the enterprise must obtain a new affidavit each financial year.</li>
</ol>
</div>

<div class="signature-block">
  <p><span class="defined-term">Deponent:</span></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Signature of Deponent</p>
  <p class="signature-label">Full Name: ${deponentName}</p>
  <p class="signature-label">Identity Number: ${deponentIdNumber}</p>
  <p class="signature-label">Date: ${affidavitDate}</p>
  <p class="signature-label">Place: ___________________________</p>
</div>

<div class="commissioner-block">
  <h3>Commissioner of Oaths</h3>
  <p>I certify that the deponent has acknowledged that he/she knows and understands the contents of this affidavit, which was signed and sworn to/affirmed before me at _________________________ on this _______ day of _________________ 20___, and that the regulations contained in Government Notice R1258 of 21 July 1972 (as amended) have been complied with.</p>

  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Commissioner of Oaths</p>
  <p class="signature-label">Full Name: ___________________________</p>
  <p class="signature-label">Designation: ___________________________</p>
  <p class="signature-label">Business Address: ___________________________</p>
  <p class="signature-label">Area: ___________________________</p>
  <p><br></p>
  <p class="signature-label">Stamp:</p>
  <div style="border: 1px dashed #cbd5e0; width: 200px; height: 80px; margin-top: 5px;"></div>
</div>

<div class="footer">
  <p>This affidavit is issued in terms of the Broad-Based Black Economic Empowerment Act 53 of 2003, as amended, and the Codes of Good Practice.</p>
  <p>${companyName} &bull; Registration No. ${regNumber}</p>
</div>

</body>
</html>`;
  }

  private employmentContractPermanent(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const employeeName = data["employeeName"];
    const employeeIdNumber = data["employeeIdNumber"];
    const position = data["position"];
    const startDate = data["startDate"];
    const salary = data["salary"];
    const workingHours = data["workingHours"];
    const leaveEntitlement = data["leaveEntitlement"];
    const noticePeriod = data["noticePeriod"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Employment Contract - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .clause-number { font-weight: bold; margin-right: 5px; }
  .sub-clause { margin-left: 25px; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 35%; font-weight: bold; }
  .signature-block { margin-top: 60px; }
  .signature-col { margin-bottom: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; margin: 3px 0; }
  .witness-block { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Contract of Employment</h1>
<h2>Permanent Employment</h2>
<h2>In terms of the Basic Conditions of Employment Act 75 of 1997, as amended</h2>

<h3>1. Parties</h3>
<p>This contract of employment is entered into between:</p>
<table class="detail-table">
  <tr><th>Employer</th><td>${companyName} ("the Employer")</td></tr>
  <tr><th>Employee</th><td>${employeeName} ("the Employee")</td></tr>
  <tr><th>Identity Number</th><td>${employeeIdNumber}</td></tr>
</table>

<h3>2. Commencement and Nature of Employment</h3>
<p><span class="clause-number">2.1</span> The Employee's employment shall commence on <span class="defined-term">${startDate}</span>.</p>
<p><span class="clause-number">2.2</span> This is a contract of <span class="defined-term">permanent employment</span> and shall continue indefinitely until terminated in accordance with clause 11 below.</p>
<p><span class="clause-number">2.3</span> The first three (3) months of employment shall constitute a probationary period in terms of Schedule 8 of the Labour Relations Act 66 of 1995, during which the Employee's performance and suitability will be assessed.</p>

<h3>3. Job Title and Duties</h3>
<p><span class="clause-number">3.1</span> The Employee is employed in the position of <span class="defined-term">${position}</span>.</p>
<p><span class="clause-number">3.2</span> The Employee's duties shall include those reasonably associated with the position and as may be assigned by the Employer from time to time. A detailed job description may be provided separately.</p>
<p><span class="clause-number">3.3</span> The Employee shall perform all duties diligently, faithfully, and to the best of their ability.</p>

<h3>4. Place of Work</h3>
<p><span class="clause-number">4.1</span> The Employee's principal place of work shall be at the Employer's premises or such other location as the Employer may reasonably direct from time to time.</p>

<h3>5. Remuneration</h3>
<p><span class="clause-number">5.1</span> The Employee shall receive a gross monthly salary of <span class="defined-term">R ${salary}</span>, payable on or before the last business day of each month, by electronic transfer into the Employee's nominated bank account.</p>
<p><span class="clause-number">5.2</span> Statutory deductions for PAYE, UIF, and any other legally required contributions shall be deducted from the gross salary.</p>
<p><span class="clause-number">5.3</span> The salary shall be reviewed annually at the Employer's sole discretion, taking into account the Employee's performance and prevailing economic conditions. Any increase is not guaranteed.</p>

<h3>6. Working Hours</h3>
<p><span class="clause-number">6.1</span> The Employee's ordinary working hours shall be <span class="defined-term">${workingHours} hours per week</span>, in accordance with sections 9 and 10 of the Basic Conditions of Employment Act 75 of 1997 ("BCEA").</p>
<p><span class="clause-number">6.2</span> The ordinary working hours shall not exceed 45 hours per week as prescribed by section 9(1) of the BCEA.</p>
<p><span class="clause-number">6.3</span> The Employee may be required to work overtime in accordance with section 10 of the BCEA, subject to agreement and the statutory maximum of 10 hours per week. Overtime shall be compensated at 1.5 times the Employee's normal hourly rate, or by agreement, the Employee may receive paid time off in lieu.</p>
<p><span class="clause-number">6.4</span> The Employee shall be entitled to a meal interval of at least one (1) hour after every five (5) consecutive hours of work, in terms of section 14 of the BCEA.</p>

<h3>7. Leave</h3>
<p><span class="clause-number">7.1</span> <span class="defined-term">Annual Leave:</span> The Employee shall be entitled to <span class="defined-term">${leaveEntitlement} working days</span> of paid annual leave per leave cycle (12 consecutive months of employment), in terms of section 20 of the BCEA. The minimum statutory entitlement is 21 consecutive days (15 working days).</p>
<p><span class="clause-number">7.2</span> <span class="defined-term">Sick Leave:</span> The Employee shall be entitled to paid sick leave in accordance with section 22 of the BCEA, being 30 days over every 36-month cycle. During the first six months of employment, the Employee is entitled to one day of paid sick leave for every 26 days worked.</p>
<p><span class="clause-number">7.3</span> <span class="defined-term">Family Responsibility Leave:</span> The Employee shall be entitled to three (3) days of paid family responsibility leave per annual leave cycle in terms of section 27 of the BCEA.</p>
<p><span class="clause-number">7.4</span> <span class="defined-term">Maternity Leave:</span> A pregnant Employee is entitled to at least four (4) consecutive months of maternity leave in terms of section 25 of the BCEA.</p>
<p><span class="clause-number">7.5</span> <span class="defined-term">Parental Leave:</span> The Employee is entitled to ten (10) consecutive days of unpaid parental leave in terms of section 25A of the BCEA.</p>

<h3>8. Public Holidays</h3>
<p><span class="clause-number">8.1</span> The Employee shall be entitled to all public holidays as declared in terms of the Public Holidays Act 36 of 1994. If required to work on a public holiday, the Employee shall be compensated at double the normal daily rate or granted a day off by agreement.</p>

<h3>9. Deductions</h3>
<p><span class="clause-number">9.1</span> No deductions shall be made from the Employee's remuneration except as permitted by section 34 of the BCEA, including statutory deductions, deductions authorised in writing by the Employee, and deductions permitted by a collective agreement, court order, or arbitration award.</p>

<h3>10. Confidentiality</h3>
<p><span class="clause-number">10.1</span> The Employee shall not, during or after employment, disclose, use, or publish any confidential information, trade secrets, or proprietary information of the Employer, except as required in the proper performance of their duties.</p>
<p><span class="clause-number">10.2</span> All documents, records, data, and materials created or received by the Employee in the course of employment shall remain the property of the Employer and must be returned upon termination.</p>

<h3>11. Termination of Employment</h3>
<p><span class="clause-number">11.1</span> Either party may terminate this contract by giving <span class="defined-term">${noticePeriod}</span> written notice to the other party, in accordance with section 37 of the BCEA.</p>
<p><span class="clause-number">11.2</span> The minimum statutory notice periods prescribed by section 37(1) of the BCEA are:</p>
<p class="sub-clause">(a) One week, if employed for six months or less;</p>
<p class="sub-clause">(b) Two weeks, if employed for more than six months but not more than one year;</p>
<p class="sub-clause">(c) Four weeks, if employed for one year or more.</p>
<p><span class="clause-number">11.3</span> The Employer may terminate employment without notice for reasons of gross misconduct, subject to a fair disciplinary procedure in terms of Schedule 8 of the Labour Relations Act 66 of 1995.</p>
<p><span class="clause-number">11.4</span> Upon termination, the Employer shall pay all outstanding remuneration, including pro-rata leave pay, in terms of section 40 of the BCEA.</p>

<h3>12. Disciplinary and Grievance Procedures</h3>
<p><span class="clause-number">12.1</span> The Employer's disciplinary code and grievance procedures, which shall be provided to the Employee, shall apply. These procedures are consistent with the principles of fairness set out in Schedule 8 of the Labour Relations Act 66 of 1995.</p>

<h3>13. General</h3>
<p><span class="clause-number">13.1</span> This contract constitutes the entire agreement between the parties regarding the Employee's employment and supersedes all prior agreements, understandings, or representations.</p>
<p><span class="clause-number">13.2</span> No amendment to this contract shall be valid unless reduced to writing and signed by both parties.</p>
<p><span class="clause-number">13.3</span> This contract shall be governed by the laws of the Republic of South Africa.</p>

<h3>14. Acknowledgement</h3>
<p>The Employee acknowledges that:</p>
<p class="sub-clause">(a) A copy of this contract has been provided to them as required by section 29 of the BCEA;</p>
<p class="sub-clause">(b) They have read, understood, and agree to the terms and conditions set out herein.</p>

<div class="signature-block">
  <div class="signature-col">
    <p><span class="defined-term">Signed by the Employer:</span></p>
    <p><br><span class="signature-line">&nbsp;</span></p>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ___________________________</p>
    <p class="signature-label">Designation: ___________________________</p>
    <p class="signature-label">Date: ___________________________</p>
  </div>
  <div class="signature-col">
    <p><span class="defined-term">Signed by the Employee:</span></p>
    <p><br><span class="signature-line">&nbsp;</span></p>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ${employeeName}</p>
    <p class="signature-label">Identity Number: ${employeeIdNumber}</p>
    <p class="signature-label">Date: ___________________________</p>
  </div>
</div>

<div class="witness-block">
  <p><span class="defined-term">Witnesses:</span></p>
  <p>1. Signature: <span class="signature-line">&nbsp;</span> &nbsp;&nbsp; Name: ___________________________</p>
  <p>2. Signature: <span class="signature-line">&nbsp;</span> &nbsp;&nbsp; Name: ___________________________</p>
</div>

<div class="footer">
  <p>This contract is subject to the Basic Conditions of Employment Act 75 of 1997, the Labour Relations Act 66 of 1995, and all other applicable legislation of the Republic of South Africa.</p>
  <p>${companyName}</p>
</div>

</body>
</html>`;
  }

  private ohsSafetyPolicy(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const managingDirector = data["managingDirector"];
    const safetyOfficer = data["safetyOfficer"];
    const address = data["address"];
    const policyDate = data["date"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OHS Safety Policy - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .policy-statement { border: 2px solid #1a365d; padding: 20px; margin: 20px 0; background: #f7fafc; font-style: italic; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 35%; font-weight: bold; }
  .signature-block { margin-top: 50px; }
  .signature-col { margin-bottom: 40px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; margin: 3px 0; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } }
</style>
</head>
<body>

<h1>Occupational Health and Safety Policy</h1>
<h2>${companyName}</h2>
<h2>In terms of the Occupational Health and Safety Act 85 of 1993</h2>

<table class="detail-table">
  <tr><th>Company</th><td>${companyName}</td></tr>
  <tr><th>Address</th><td>${address}</td></tr>
  <tr><th>Managing Director / CEO</th><td>${managingDirector}</td></tr>
  <tr><th>Health and Safety Officer</th><td>${safetyOfficer}</td></tr>
  <tr><th>Effective Date</th><td>${policyDate}</td></tr>
</table>

<h3>1. Policy Statement</h3>
<div class="policy-statement">
  <p>${companyName} is committed to providing and maintaining a safe and healthy working environment for all employees, contractors, visitors, and any other persons who may be affected by its activities. The Company recognises its obligations under the Occupational Health and Safety Act 85 of 1993 ("the OHS Act") and undertakes to comply with all applicable health and safety legislation, regulations, and codes of practice.</p>
  <p>Management accepts overall responsibility for health and safety and will ensure that adequate resources are allocated to achieve and maintain compliance. Every employee has a duty to co-operate with the employer and to take reasonable care for the health and safety of themselves and others.</p>
</div>

<h3>2. Objectives</h3>
<p>The objectives of this policy are to:</p>
<ul>
  <li>Provide a safe working environment that is free from hazards, as far as is reasonably practicable;</li>
  <li>Prevent workplace injuries, occupational diseases, and incidents;</li>
  <li>Comply with all applicable provisions of the OHS Act, its regulations, and relevant standards (including SANS standards);</li>
  <li>Identify, assess, and control all workplace hazards through systematic risk assessment;</li>
  <li>Provide adequate information, instruction, training, and supervision to all employees;</li>
  <li>Consult with employees and their health and safety representatives on matters affecting health and safety;</li>
  <li>Maintain systems for reporting, recording, and investigating incidents and near-misses;</li>
  <li>Continuously improve health and safety performance through regular review and monitoring.</li>
</ul>

<h3>3. Legal Framework</h3>
<p>This policy is issued in terms of section 7 of the OHS Act, which requires every employer to prepare and bring to the attention of all employees a written policy concerning the protection of the health and safety of employees at work. This policy is further informed by:</p>
<ul>
  <li>The Occupational Health and Safety Act 85 of 1993 and its regulations;</li>
  <li>The General Safety Regulations, 1986;</li>
  <li>The General Administrative Regulations, 2003;</li>
  <li>The Construction Regulations, 2014 (where applicable);</li>
  <li>The Environmental Regulations for Workplaces, 1987;</li>
  <li>The Hazardous Chemical Substances Regulations, 1995;</li>
  <li>The Compensation for Occupational Injuries and Diseases Act 130 of 1993.</li>
</ul>

<h3>4. Responsibilities</h3>
<p><span class="defined-term">4.1 Managing Director / CEO (${managingDirector}):</span></p>
<ul>
  <li>Bears overall accountability for health and safety in terms of section 16(1) of the OHS Act;</li>
  <li>Ensures that adequate resources, including financial, human, and material resources, are allocated to maintain a safe workplace;</li>
  <li>Appoints competent persons to assist in compliance with the OHS Act (section 16(2));</li>
  <li>Ensures that this policy is implemented, communicated, and reviewed.</li>
</ul>
<p><span class="defined-term">4.2 Health and Safety Officer (${safetyOfficer}):</span></p>
<ul>
  <li>Assists the employer in complying with the OHS Act and its regulations;</li>
  <li>Conducts and co-ordinates risk assessments and workplace inspections;</li>
  <li>Investigates all workplace incidents, injuries, and near-misses and maintains records;</li>
  <li>Ensures that all statutory appointments (first aiders, fire marshals, etc.) are made and current;</li>
  <li>Co-ordinates health and safety training and awareness programmes;</li>
  <li>Maintains the health and safety file, incident register, and all statutory records;</li>
  <li>Liaises with the Department of Employment and Labour as required.</li>
</ul>
<p><span class="defined-term">4.3 Employees:</span></p>
<ul>
  <li>Take reasonable care for their own health and safety and that of other persons who may be affected by their acts or omissions (section 14);</li>
  <li>Co-operate with the employer in complying with the OHS Act;</li>
  <li>Report any unsafe or unhealthy conditions, equipment, or practices to a supervisor or the Safety Officer without delay;</li>
  <li>Use prescribed personal protective equipment (PPE) correctly and maintain it in good condition;</li>
  <li>Do not interfere with, damage, or misuse any safety equipment or installations;</li>
  <li>Report all injuries, incidents, and near-misses immediately.</li>
</ul>

<h3>5. Hazard Identification and Risk Assessment</h3>
<ul>
  <li>The Company shall conduct baseline risk assessments for all work activities, processes, and areas;</li>
  <li>Issue-based risk assessments shall be conducted whenever new equipment, processes, or substances are introduced;</li>
  <li>Continuous risk assessments shall form part of day-to-day operations;</li>
  <li>Risk assessments shall be documented and reviewed at least annually or after any incident;</li>
  <li>The hierarchy of controls shall be applied: elimination, substitution, engineering controls, administrative controls, and personal protective equipment.</li>
</ul>

<h3>6. Personal Protective Equipment (PPE)</h3>
<ul>
  <li>The Company shall provide appropriate PPE, free of charge, to all employees exposed to workplace hazards, in terms of the General Safety Regulations;</li>
  <li>PPE shall be selected based on the risk assessment and relevant SANS standards;</li>
  <li>Employees shall be trained in the correct use, care, and storage of PPE;</li>
  <li>PPE shall be maintained, inspected regularly, and replaced when damaged or worn;</li>
  <li>PPE is a last line of defence and shall not replace other control measures.</li>
</ul>

<h3>7. Emergency Procedures</h3>
<ul>
  <li>The Company shall develop and maintain an emergency plan covering fire, evacuation, medical emergencies, chemical spills, and other foreseeable emergencies;</li>
  <li>Emergency routes and exits shall be clearly marked and kept unobstructed;</li>
  <li>Fire-fighting equipment shall be maintained, inspected, and serviced in accordance with SANS 1475 and the Fire Brigade Services Act;</li>
  <li>Emergency drills shall be conducted at least twice annually;</li>
  <li>Appointed first aiders shall be available during all working hours and first aid equipment shall be maintained;</li>
  <li>Emergency contact numbers shall be prominently displayed in the workplace.</li>
</ul>

<h3>8. Incident Reporting and Investigation</h3>
<ul>
  <li>All workplace injuries, diseases, and incidents shall be reported and recorded in the incident register;</li>
  <li>Incidents resulting in death, serious injury, or dangerous occurrences shall be reported to the Provincial Director of the Department of Employment and Labour as required by section 24 of the OHS Act and the General Administrative Regulations;</li>
  <li>All incidents shall be investigated to determine root causes and prevent recurrence;</li>
  <li>Corrective actions arising from investigations shall be documented, assigned, and tracked to completion.</li>
</ul>

<h3>9. Training</h3>
<ul>
  <li>All new employees shall receive health and safety induction training before commencing work;</li>
  <li>Ongoing training shall be provided on specific hazards, safe work procedures, emergency procedures, and the use of PPE;</li>
  <li>Appointed health and safety representatives shall receive training as prescribed by section 18 of the OHS Act;</li>
  <li>Training records shall be maintained and kept up to date;</li>
  <li>Refresher training shall be provided at regular intervals and following any changes to processes or legislation.</li>
</ul>

<h3>10. Health and Safety Committee</h3>
<p>Where required by section 19 of the OHS Act (workplaces with two or more health and safety representatives), the Company shall establish a health and safety committee. The committee shall meet at least once every three months and shall:</p>
<ul>
  <li>Review the implementation and effectiveness of this policy;</li>
  <li>Consider reports from health and safety representatives;</li>
  <li>Discuss incident investigations and corrective actions;</li>
  <li>Make recommendations to the employer on health and safety matters.</li>
</ul>

<h3>11. Review</h3>
<p>This policy shall be reviewed at least <span class="defined-term">annually</span>, or sooner in the event of:</p>
<ul>
  <li>Changes in legislation or regulations;</li>
  <li>Significant organisational changes;</li>
  <li>Following a serious incident or investigation;</li>
  <li>On recommendation by the health and safety committee.</li>
</ul>
<p>Amendments shall be communicated to all employees and displayed in a prominent position in the workplace.</p>

<div class="signature-block">
  <div class="signature-col">
    <p><span class="defined-term">Managing Director / CEO:</span></p>
    <p><br><span class="signature-line">&nbsp;</span></p>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ${managingDirector}</p>
    <p class="signature-label">Date: ${policyDate}</p>
  </div>
  <div class="signature-col">
    <p><span class="defined-term">Health and Safety Officer:</span></p>
    <p><br><span class="signature-line">&nbsp;</span></p>
    <p class="signature-label">Signature</p>
    <p class="signature-label">Name: ${safetyOfficer}</p>
    <p class="signature-label">Date: ${policyDate}</p>
  </div>
</div>

<div class="footer">
  <p>This policy is issued in terms of section 7 of the Occupational Health and Safety Act 85 of 1993.</p>
  <p>${companyName} &bull; ${address}</p>
</div>

</body>
</html>`;
  }

  private coidaRoeWorksheet(data: Record<string, string>): string {
    const companyName = data["companyName"];
    const regNumber = data["registrationNumber"];
    const assessmentYear = data["assessmentYear"];
    const totalEmployees = data["totalEmployees"];
    const totalEarnings = data["totalEarnings"];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>COIDA Return of Earnings Worksheet - ${companyName}</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; margin: 50px 60px; line-height: 1.8; color: #1a1a1a; font-size: 13px; }
  h1 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #1a365d; }
  h2 { text-align: center; font-size: 14px; font-weight: normal; color: #4a5568; margin-top: 0; margin-bottom: 30px; }
  h3 { font-size: 14px; text-transform: uppercase; color: #1a365d; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
  p { text-align: justify; margin: 8px 0; }
  .defined-term { font-weight: bold; }
  .detail-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .detail-table th, .detail-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; font-size: 13px; }
  .detail-table th { background: #f7fafc; width: 40%; font-weight: bold; }
  .calc-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  .calc-table th, .calc-table td { border: 1px solid #cbd5e0; padding: 10px 12px; font-size: 13px; }
  .calc-table th { background: #f7fafc; text-align: left; }
  .calc-table td { text-align: right; }
  .calc-table td:first-child { text-align: left; }
  .calc-table .total-row { background: #edf2f7; font-weight: bold; }
  .calc-table .input-cell { background: #fffff0; min-width: 120px; }
  .note { font-size: 11px; color: #718096; font-style: italic; margin: 5px 0; }
  .declaration-box { border: 2px solid #1a365d; padding: 20px; margin: 20px 0; background: #f7fafc; }
  .signature-block { margin-top: 50px; }
  .signature-line { border-bottom: 1px dotted #1a1a1a; width: 300px; display: inline-block; margin-bottom: 5px; }
  .signature-label { font-size: 11px; color: #4a5568; margin: 3px 0; }
  .footer { margin-top: 40px; border-top: 2px solid #1a365d; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; }
  @media print { body { margin: 30px 40px; } .calc-table .input-cell { background: #fff; } }
</style>
</head>
<body>

<h1>Return of Earnings Worksheet</h1>
<h2>Compensation for Occupational Injuries and Diseases Act 130 of 1993</h2>
<h2>Assessment Year: ${assessmentYear}</h2>

<h3>1. Employer Details</h3>
<table class="detail-table">
  <tr><th>Employer Name</th><td>${companyName}</td></tr>
  <tr><th>CIPC Registration Number</th><td>${regNumber}</td></tr>
  <tr><th>COIDA Registration Number</th><td style="background:#fffff0">___________________________</td></tr>
  <tr><th>Assessment Year</th><td>${assessmentYear}</td></tr>
  <tr><th>Total Number of Employees</th><td>${totalEmployees}</td></tr>
  <tr><th>Industry Classification / Sub-class</th><td style="background:#fffff0">___________________________</td></tr>
  <tr><th>Assessment Rate (%)</th><td style="background:#fffff0">___________________________</td></tr>
</table>
<p class="note">The COIDA registration number and assessment rate are assigned by the Compensation Fund. Refer to your assessment notice or contact the Compensation Fund if unknown.</p>

<h3>2. Earnings Breakdown by Category</h3>
<p>In terms of the COIDA, "earnings" means the remuneration paid or payable to an employee for services rendered, including basic salary, overtime, bonuses, commissions, allowances (excluding travel reimbursements), and the cash value of benefits in kind.</p>

<table class="calc-table">
  <tr>
    <th>Category</th>
    <th>Number of Employees</th>
    <th>Total Earnings (R)</th>
  </tr>
  <tr>
    <td>Permanent Employees (Full-time)</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>Permanent Employees (Part-time)</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>Fixed-term / Contract Employees</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>Casual / Temporary Employees</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>Directors / Members Receiving Remuneration</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>Apprentices / Learners</td>
    <td class="input-cell">&nbsp;</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr class="total-row">
    <td>TOTAL</td>
    <td>${totalEmployees}</td>
    <td>R ${totalEarnings}</td>
  </tr>
</table>

<p class="note">Earnings are subject to the annual earnings ceiling as gazetted by the Minister of Employment and Labour. Amounts exceeding the ceiling per individual employee must be capped accordingly.</p>

<h3>3. Assessment Calculation</h3>
<table class="calc-table">
  <tr>
    <th style="width:60%">Description</th>
    <th>Amount (R)</th>
  </tr>
  <tr>
    <td>(A) Total Gross Earnings</td>
    <td>R ${totalEarnings}</td>
  </tr>
  <tr>
    <td>(B) Less: Earnings above the annual ceiling (per employee)</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>(C) Assessable Earnings (A - B)</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>(D) Assessment Rate (%)</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr class="total-row">
    <td>(E) Assessment Payable (C x D / 100)</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr>
    <td>(F) Less: Previous payments / credits</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
  <tr class="total-row">
    <td>(G) Balance Payable / (Refundable) (E - F)</td>
    <td class="input-cell">&nbsp;</td>
  </tr>
</table>

<h3>4. Earnings Components Included</h3>
<p>The following components of remuneration must be included in the Return of Earnings:</p>
<ul>
  <li>Basic salary or wages;</li>
  <li>Overtime payments;</li>
  <li>Bonuses (annual, performance, and production);</li>
  <li>Commission;</li>
  <li>Allowances (housing, car, cell phone, etc.) excluding reimbursements for actual expenses;</li>
  <li>Value of benefits in kind (e.g., accommodation, meals) where applicable;</li>
  <li>Leave pay;</li>
  <li>Severance pay;</li>
  <li>UIF employer contributions are <span class="defined-term">excluded</span>.</li>
</ul>

<h3>5. Submission Requirements</h3>
<p>In terms of section 80 of the COIDA:</p>
<ul>
  <li>The Return of Earnings must be submitted to the Compensation Fund by <span class="defined-term">31 March</span> each year for the preceding assessment year;</li>
  <li>Submission may be done electronically via the Department of Employment and Labour online portal;</li>
  <li>Late submissions may attract penalties and interest;</li>
  <li>The employer must retain supporting payroll records for at least four (4) years.</li>
</ul>

<h3>6. Penalties for Non-Compliance</h3>
<p>Failure to submit the Return of Earnings or to pay assessments may result in:</p>
<ul>
  <li>A penalty of up to 10% of the assessment due;</li>
  <li>Interest on overdue amounts;</li>
  <li>The employer being held personally liable for any compensation payable to injured employees;</li>
  <li>Criminal prosecution in terms of section 91 of the COIDA.</li>
</ul>

<div class="declaration-box">
<h3>7. Declaration</h3>
<p>I, the undersigned, hereby declare that the information contained in this worksheet is true and correct to the best of my knowledge and belief. I understand that the submission of false information constitutes an offence in terms of the Compensation for Occupational Injuries and Diseases Act 130 of 1993.</p>
</div>

<div class="signature-block">
  <p><span class="defined-term">Prepared by:</span></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Name: ___________________________</p>
  <p class="signature-label">Designation: ___________________________</p>
  <p class="signature-label">Date: ___________________________</p>

  <p style="margin-top:40px"><span class="defined-term">Authorised by:</span></p>
  <p><br><span class="signature-line">&nbsp;</span></p>
  <p class="signature-label">Name: ___________________________</p>
  <p class="signature-label">Designation: Director / Authorised Representative</p>
  <p class="signature-label">Date: ___________________________</p>
</div>

<div class="footer">
  <p>This worksheet is prepared in terms of the Compensation for Occupational Injuries and Diseases Act 130 of 1993.</p>
  <p>${companyName} &bull; Registration No. ${regNumber}</p>
</div>

</body>
</html>`;
  }
}
