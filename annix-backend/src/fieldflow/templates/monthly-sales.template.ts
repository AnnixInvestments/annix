import { MonthlySalesReport } from "../dto/report.dto";
import { formatCurrencyZA, formatDateZA, wrapHtml } from "./base.template";

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export function monthlySalesTemplate(report: MonthlySalesReport, repName: string): string {
  const startDate = new Date(report.period.startDate);
  const monthDisplay = startDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const maxRevenue = Math.max(...report.revenueByWeek.map((w) => w.revenue), 1);
  const maxProspectCount = Math.max(...report.prospectsByStatus.map((p) => p.count), 1);

  const content = `
    <h2>Revenue Summary</h2>
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${formatCurrencyZA(report.summary.totalRevenue)}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Deals Closed</div>
        <div class="stat-value">${report.summary.dealsClosed}</div>
        <div class="stat-subvalue">Avg: ${formatCurrencyZA(report.summary.averageDealSize)}</div>
      </div>
      <div class="stat-card ${report.summary.winRate >= 50 ? "green" : "yellow"}">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">${report.summary.winRate}%</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Pipeline Value</div>
        <div class="stat-value">${formatCurrencyZA(report.summary.pipelineValue)}</div>
      </div>
    </div>

    <h2>Activity Summary</h2>
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card">
        <div class="stat-label">Meetings Held</div>
        <div class="stat-value">${report.summary.meetingsHeld}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Visits Completed</div>
        <div class="stat-value">${report.summary.visitsCompleted}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">New Prospects</div>
        <div class="stat-value">${report.summary.newProspectsAdded}</div>
      </div>
    </div>

    <h2>Revenue by Week</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 100px;">Week</th>
          <th>Revenue</th>
          <th style="width: 100px;">Deals</th>
        </tr>
      </thead>
      <tbody>
        ${report.revenueByWeek
          .map(
            (week) => `
          <tr>
            <td>${week.week}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 16px; background: #F3F4F6; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${(week.revenue / maxRevenue) * 100}%; height: 100%; background: #22C55E;"></div>
                </div>
                <span style="min-width: 80px;">${formatCurrencyZA(week.revenue)}</span>
              </div>
            </td>
            <td>${week.deals}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <h2>Prospects by Status</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 120px;">Status</th>
          <th>Count</th>
          <th style="width: 120px;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${report.prospectsByStatus
          .map(
            (item) => `
          <tr>
            <td><span class="status-badge status-${item.status}">${statusLabels[item.status] ?? item.status}</span></td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 16px; background: #F3F4F6; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${(item.count / maxProspectCount) * 100}%; height: 100%; background: #3B82F6;"></div>
                </div>
                <span style="min-width: 40px;">${item.count}</span>
              </div>
            </td>
            <td>${formatCurrencyZA(item.value)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    ${
      report.topDeals.length > 0
        ? `
    <h2>Top Deals</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Company</th>
          <th style="width: 120px;">Closed Date</th>
          <th style="width: 120px;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${report.topDeals
          .map(
            (deal, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${deal.companyName}</td>
            <td>${formatDateZA(deal.closedDate)}</td>
            <td style="color: #047857; font-weight: 600;">${formatCurrencyZA(deal.value)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    `
        : ""
    }
  `;

  return wrapHtml(content, "Monthly Sales Report", repName, monthDisplay);
}
