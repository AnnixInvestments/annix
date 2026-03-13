export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface WeeklyActivityReport {
  period: ReportDateRange;
  summary: {
    totalMeetings: number;
    completedMeetings: number;
    cancelledMeetings: number;
    totalVisits: number;
    successfulVisits: number;
    newProspects: number;
    contactedProspects: number;
    dealsWon: number;
    dealsLost: number;
    revenueWon: number;
  };
  meetingsByDay: Array<{ date: string; count: number; completed: number }>;
  visitsByDay: Array<{ date: string; count: number; successful: number }>;
  prospectStatusChanges: Array<{
    prospectId: number;
    companyName: string;
    fromStatus: string;
    toStatus: string;
    date: string;
  }>;
}

export interface MonthlySalesReport {
  period: ReportDateRange;
  summary: {
    totalRevenue: number;
    dealsClosed: number;
    averageDealSize: number;
    winRate: number;
    pipelineValue: number;
    meetingsHeld: number;
    visitsCompleted: number;
    newProspectsAdded: number;
  };
  revenueByWeek: Array<{ week: string; revenue: number; deals: number }>;
  prospectsByStatus: Array<{ status: string; count: number; value: number }>;
  topDeals: Array<{
    prospectId: number;
    companyName: string;
    value: number;
    closedDate: string;
  }>;
}

export interface TerritoryCoverageReport {
  period: ReportDateRange;
  bounds: { north: number; south: number; east: number; west: number };
  prospects: Array<{
    id: number;
    companyName: string;
    latitude: number;
    longitude: number;
    status: string;
    lastVisitDate: string | null;
    visitCount: number;
  }>;
  visits: Array<{
    id: number;
    prospectId: number;
    latitude: number;
    longitude: number;
    date: string;
    outcome: string | null;
  }>;
  coverage: {
    totalProspectsWithLocation: number;
    visitedProspects: number;
    coveragePercentage: number;
  };
}

export interface MeetingOutcomesReport {
  period: ReportDateRange;
  summary: {
    totalMeetings: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    averageDurationMinutes: number | null;
  };
  outcomesByType: Array<{
    meetingType: string;
    total: number;
    completed: number;
    cancelled: number;
  }>;
  detailedMeetings: Array<{
    id: number;
    title: string;
    prospectName: string | null;
    scheduledDate: string;
    status: string;
    duration: number | null;
    outcomes: string | null;
  }>;
}
