import { WeeklyActivityReport } from "../dto/report.dto";
import { formatCurrencyZA, formatDateZA, wrapHtml } from "./base.template";

export function weeklyActivityTemplate(report: WeeklyActivityReport, repName: string): string {
  const dateRange = `${formatDateZA(report.period.startDate)} - ${formatDateZA(report.period.endDate)}`;
  const maxMeetings = Math.max(...report.meetingsByDay.map((d) => d.count), 1);
  const maxVisits = Math.max(...report.visitsByDay.map((d) => d.count), 1);

  const content = `
    <h2>Summary</h2>
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-label">Total Meetings</div>
        <div class="stat-value">${report.summary.totalMeetings}</div>
        <div class="stat-subvalue">${report.summary.completedMeetings} completed</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Total Visits</div>
        <div class="stat-value">${report.summary.totalVisits}</div>
        <div class="stat-subvalue">${report.summary.successfulVisits} successful</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">New Prospects</div>
        <div class="stat-value">${report.summary.newProspects}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Deals Won</div>
        <div class="stat-value">${report.summary.dealsWon}</div>
        <div class="stat-subvalue">${formatCurrencyZA(report.summary.revenueWon)}</div>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card">
        <div class="stat-label">Contacted Prospects</div>
        <div class="stat-value">${report.summary.contactedProspects}</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-label">Cancelled Meetings</div>
        <div class="stat-value">${report.summary.cancelledMeetings}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Deals Lost</div>
        <div class="stat-value">${report.summary.dealsLost}</div>
      </div>
    </div>

    <h2>Meetings by Day</h2>
    <div class="chart-container">
      <div class="bar-chart">
        ${report.meetingsByDay
          .map(
            (day) => `
          <div class="bar-item">
            <div class="bar" style="height: ${(day.count / maxMeetings) * 100}%;"></div>
            <div class="bar secondary" style="height: ${(day.completed / maxMeetings) * 100}%; position: absolute; bottom: 0;"></div>
            <div class="bar-label">${new Date(day.date).toLocaleDateString("en-ZA", { weekday: "short" })}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot" style="background: #3B82F6;"></div>
          <span>Total</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #22C55E;"></div>
          <span>Completed</span>
        </div>
      </div>
    </div>

    <h2>Visits by Day</h2>
    <div class="chart-container">
      <div class="bar-chart">
        ${report.visitsByDay
          .map(
            (day) => `
          <div class="bar-item">
            <div class="bar" style="height: ${(day.count / maxVisits) * 100}%; background: #8B5CF6;"></div>
            <div class="bar secondary" style="height: ${(day.successful / maxVisits) * 100}%; position: absolute; bottom: 0;"></div>
            <div class="bar-label">${new Date(day.date).toLocaleDateString("en-ZA", { weekday: "short" })}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot" style="background: #8B5CF6;"></div>
          <span>Total</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #22C55E;"></div>
          <span>Successful</span>
        </div>
      </div>
    </div>

    ${
      report.prospectStatusChanges.length > 0
        ? `
    <h2>Prospect Status Changes</h2>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Date</th>
          <th>From Status</th>
          <th>To Status</th>
        </tr>
      </thead>
      <tbody>
        ${report.prospectStatusChanges
          .map(
            (change) => `
          <tr>
            <td>${change.companyName}</td>
            <td>${formatDateZA(change.date)}</td>
            <td><span class="status-badge status-${change.fromStatus}">${change.fromStatus}</span></td>
            <td><span class="status-badge status-${change.toStatus}">${change.toStatus}</span></td>
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

  return wrapHtml(content, "Weekly Activity Report", repName, dateRange);
}
