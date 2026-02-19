import { TerritoryCoverageReport } from "../dto/report.dto";
import { formatDateZA, wrapHtml } from "./base.template";

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export function territoryCoverageTemplate(
  report: TerritoryCoverageReport,
  repName: string,
): string {
  const dateRange = `${formatDateZA(report.period.startDate)} - ${formatDateZA(report.period.endDate)}`;

  const sortedProspects = [...report.prospects].sort((a, b) => b.visitCount - a.visitCount);
  const displayProspects = sortedProspects.slice(0, 30);

  const content = `
    <h2>Coverage Summary</h2>
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card blue">
        <div class="stat-label">Prospects with Location</div>
        <div class="stat-value">${report.coverage.totalProspectsWithLocation}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Visited Prospects</div>
        <div class="stat-value">${report.coverage.visitedProspects}</div>
      </div>
      <div class="stat-card ${report.coverage.coveragePercentage >= 50 ? "green" : "yellow"}">
        <div class="stat-label">Coverage Rate</div>
        <div class="stat-value">${report.coverage.coveragePercentage}%</div>
      </div>
    </div>

    <h2>Visit Statistics</h2>
    <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="stat-card">
        <div class="stat-label">Total Visits in Period</div>
        <div class="stat-value">${report.visits.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unique Locations Visited</div>
        <div class="stat-value">${new Set(report.visits.map((v) => v.prospectId)).size}</div>
      </div>
    </div>

    <h2>Prospect Locations (Top ${displayProspects.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 80px;">Visits</th>
          <th style="width: 120px;">Last Visit</th>
          <th style="width: 160px;">Location</th>
        </tr>
      </thead>
      <tbody>
        ${displayProspects
          .map(
            (prospect) => `
          <tr>
            <td>${prospect.companyName}</td>
            <td><span class="status-badge status-${prospect.status}">${statusLabels[prospect.status] ?? prospect.status}</span></td>
            <td>${prospect.visitCount}</td>
            <td>${prospect.lastVisitDate ? formatDateZA(prospect.lastVisitDate) : "Never"}</td>
            <td style="font-size: 10px; color: #6B7280;">${prospect.latitude.toFixed(4)}, ${prospect.longitude.toFixed(4)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    ${
      sortedProspects.length > 30
        ? `<p style="text-align: center; color: #6B7280; font-size: 11px; margin-top: 8px;">Showing top 30 of ${sortedProspects.length} prospects</p>`
        : ""
    }

    ${
      report.visits.length > 0
        ? `
    <div class="page-break"></div>
    <h2>Recent Visits</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 120px;">Date</th>
          <th>Prospect</th>
          <th style="width: 120px;">Outcome</th>
          <th style="width: 160px;">Location</th>
        </tr>
      </thead>
      <tbody>
        ${report.visits
          .slice(0, 50)
          .map((visit) => {
            const prospect = report.prospects.find((p) => p.id === visit.prospectId);
            return `
            <tr>
              <td>${formatDateZA(visit.date)}</td>
              <td>${prospect?.companyName ?? "Unknown"}</td>
              <td>${visit.outcome ?? "-"}</td>
              <td style="font-size: 10px; color: #6B7280;">${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}</td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
    ${
      report.visits.length > 50
        ? `<p style="text-align: center; color: #6B7280; font-size: 11px; margin-top: 8px;">Showing first 50 of ${report.visits.length} visits</p>`
        : ""
    }
    `
        : ""
    }

    <div style="margin-top: 24px; padding: 16px; background: #F3F4F6; border-radius: 8px;">
      <p style="font-size: 11px; color: #6B7280; text-align: center;">
        Note: Territory map visualization is available in the web application.
      </p>
    </div>
  `;

  return wrapHtml(content, "Territory Coverage Report", repName, dateRange);
}
