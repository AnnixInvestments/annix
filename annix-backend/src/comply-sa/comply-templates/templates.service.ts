import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateLongZA, now } from "../lib/datetime";

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

    if (template === null || template === undefined) {
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

    if (generator === null || generator === undefined) {
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
      if (overallScore >= 80) {
        return "#4caf50";
      } else if (overallScore >= 50) {
        return "#ff9800";
      } else {
        return "#f44336";
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
                return "#4caf50";
              } else if (item.status === "in_progress") {
                return "#ff9800";
              } else {
                return "#f44336";
              }
            })();

            return `<tr>
              <td>${item.requirement?.name ?? "Unknown"}</td>
              <td style="color:${statusColor};font-weight:bold">${item.status.replace("_", " ").toUpperCase()}</td>
              <td>${item.nextDueDate ?? "N/A"}</td>
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
      .sort((a, b) => (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""))
      .slice(0, 10)
      .map(
        (s) =>
          `<li><strong>${s.requirement?.name ?? "Unknown"}</strong> — due ${s.nextDueDate}</li>`,
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
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Privacy Policy - ${data["companyName"]}</title></head><body><h1>Privacy Policy</h1><h2>${data["companyName"]}</h2><p>This Privacy Policy explains how ${data["companyName"]} collects, uses, stores, and protects personal information in compliance with POPIA.</p><p>Information Officer: ${data["informationOfficerName"]} (${data["informationOfficerEmail"]})</p><p>Address: ${data["address"]}</p></body></html>`;
  }

  private popiaPaiaManual(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PAIA Manual - ${data["companyName"]}</title></head><body><h1>PAIA Manual</h1><h2>Section 51 Manual for ${data["companyName"]}</h2><p>Registration: ${data["registrationNumber"]}</p><p>Address: ${data["address"]}</p><p>Information Officer: ${data["informationOfficerName"]} (${data["informationOfficerEmail"]})</p><p>Phone: ${data["phone"]}</p></body></html>`;
  }

  private popiaBreachNotification(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Data Breach Notification - ${data["companyName"]}</title></head><body><h1>DATA BREACH NOTIFICATION</h1><p>${data["companyName"]}</p><p>Date: ${data["breachDate"]}</p><p>${data["breachDescription"]}</p><p>Data affected: ${data["dataAffected"]}</p><p>Actions: ${data["actionsTaken"]}</p><p>Contact: ${data["contactPerson"]} (${data["contactEmail"]})</p></body></html>`;
  }

  private popiaIoAppointment(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>IO Appointment - ${data["companyName"]}</title></head><body><h1>APPOINTMENT OF INFORMATION OFFICER</h1><h2>${data["companyName"]}</h2><p>Officer: ${data["officerName"]} (${data["officerTitle"]})</p><p>Date: ${data["appointmentDate"]}</p><p>Director: ${data["directorName"]}</p></body></html>`;
  }

  private bbeeEmeAffidavit(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>B-BBEE EME Affidavit - ${data["companyName"]}</title></head><body><h1>SWORN AFFIDAVIT</h1><h2>B-BBEE Exempted Micro Enterprise (EME)</h2><p>Company: ${data["companyName"]} (${data["registrationNumber"]})</p><p>Trading as: ${data["tradingName"]}</p><p>Turnover: R ${data["annualTurnover"]}</p><p>Black ownership: ${data["blackOwnershipPercent"]}%</p><p>Deponent: ${data["deponentName"]} (${data["deponentIdNumber"]})</p><p>Date: ${data["date"]}</p></body></html>`;
  }

  private employmentContractPermanent(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Employment Contract - ${data["companyName"]}</title></head><body><h1>PERMANENT EMPLOYMENT CONTRACT</h1><p>Employer: ${data["companyName"]}</p><p>Employee: ${data["employeeName"]} (${data["employeeIdNumber"]})</p><p>Position: ${data["position"]}</p><p>Start: ${data["startDate"]}</p><p>Salary: R ${data["salary"]}</p><p>Hours: ${data["workingHours"]}/week</p><p>Leave: ${data["leaveEntitlement"]} days</p><p>Notice: ${data["noticePeriod"]}</p></body></html>`;
  }

  private ohsSafetyPolicy(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>OHS Safety Policy - ${data["companyName"]}</title></head><body><h1>OCCUPATIONAL HEALTH AND SAFETY POLICY</h1><h2>${data["companyName"]}</h2><p>Address: ${data["address"]}</p><p>Managing Director: ${data["managingDirector"]}</p><p>Safety Officer: ${data["safetyOfficer"]}</p><p>Date: ${data["date"]}</p></body></html>`;
  }

  private coidaRoeWorksheet(data: Record<string, string>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>COIDA ROE Worksheet - ${data["companyName"]}</title></head><body><h1>COIDA RETURN OF EARNINGS WORKSHEET</h1><h2>${data["companyName"]}</h2><p>Registration: ${data["registrationNumber"]}</p><p>Year: ${data["assessmentYear"]}</p><p>Employees: ${data["totalEmployees"]}</p><p>Total Earnings: R ${data["totalEarnings"]}</p></body></html>`;
  }
}
