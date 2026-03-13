import { MeetingOutcomesReport } from "../dto/report.dto";
import { formatDateZA, wrapHtml } from "./base.template";

const meetingTypeLabels: Record<string, string> = {
  in_person: "In Person",
  phone: "Phone",
  video: "Video",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function meetingOutcomesTemplate(report: MeetingOutcomesReport, repName: string): string {
  const dateRange = `${formatDateZA(report.period.startDate)} - ${formatDateZA(report.period.endDate)}`;

  const content = `
    <h2>Summary</h2>
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-label">Total Meetings</div>
        <div class="stat-value">${report.summary.totalMeetings}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${report.summary.completed}</div>
        <div class="stat-subvalue">${report.summary.completionRate}% completion rate</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-label">Cancelled</div>
        <div class="stat-value">${report.summary.cancelled}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">No Show</div>
        <div class="stat-value">${report.summary.noShow}</div>
      </div>
    </div>

    ${
      report.summary.averageDurationMinutes !== null
        ? `
    <div class="stat-card" style="margin-bottom: 24px;">
      <div class="stat-label">Average Meeting Duration</div>
      <div class="stat-value">${report.summary.averageDurationMinutes} minutes</div>
    </div>
    `
        : ""
    }

    <h2>Outcomes by Meeting Type</h2>
    <table>
      <thead>
        <tr>
          <th>Meeting Type</th>
          <th style="width: 80px;">Total</th>
          <th style="width: 100px;">Completed</th>
          <th style="width: 100px;">Cancelled</th>
          <th>Completion Rate</th>
        </tr>
      </thead>
      <tbody>
        ${report.outcomesByType
          .map((item) => {
            const completionRate =
              item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            const maxTotal = Math.max(...report.outcomesByType.map((t) => t.total), 1);
            return `
            <tr>
              <td>${meetingTypeLabels[item.meetingType] ?? item.meetingType}</td>
              <td>${item.total}</td>
              <td>${item.completed}</td>
              <td>${item.cancelled}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; height: 16px; background: #F3F4F6; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${completionRate}%; height: 100%; background: ${completionRate >= 75 ? "#22C55E" : completionRate >= 50 ? "#EAB308" : "#EF4444"};"></div>
                  </div>
                  <span style="min-width: 40px;">${completionRate}%</span>
                </div>
              </td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>

    <h2>Meeting Details</h2>
    <table>
      <thead>
        <tr>
          <th>Meeting</th>
          <th>Prospect</th>
          <th style="width: 100px;">Date</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 80px;">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${report.detailedMeetings
          .slice(0, 50)
          .map(
            (meeting) => `
          <tr>
            <td>${meeting.title}</td>
            <td>${meeting.prospectName ?? "-"}</td>
            <td>${formatDateZA(meeting.scheduledDate)}</td>
            <td><span class="status-badge status-${meeting.status}">${statusLabels[meeting.status] ?? meeting.status}</span></td>
            <td>${meeting.duration !== null ? `${meeting.duration} min` : "-"}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    ${
      report.detailedMeetings.length > 50
        ? `<p style="text-align: center; color: #6B7280; font-size: 11px; margin-top: 8px;">Showing first 50 of ${report.detailedMeetings.length} meetings</p>`
        : ""
    }
  `;

  return wrapHtml(content, "Meeting Outcomes Report", repName, dateRange);
}
