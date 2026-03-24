const BASE_URL =
  typeof window !== "undefined"
    ? "/api/comply-sa"
    : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001"}/api/comply-sa`;

function buildFetchInit(opts: RequestInit): RequestInit {
  return {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const opts = options || {};
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, buildFetchInit(opts));

  if (response.status === 401 && !path.includes("/auth/")) {
    const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      const secondResponse = await fetch(url, buildFetchInit(opts));

      if (!secondResponse.ok) {
        const errorData = await secondResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${secondResponse.status}`);
      }
      return secondResponse.json() as Promise<T>;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/comply-sa/auth/login";
    }
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function login(
  email: string,
  password: string,
): Promise<{ user: Record<string, unknown>; emailVerified: boolean }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signup(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  registrationNumber?: string | null;
  termsAccepted: boolean;
}): Promise<{ user: Record<string, unknown> }> {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
  localStorage.removeItem("token");
}

export function dashboard(): Promise<{
  companyName: string;
  complianceScore: number;
  summary: { compliant: number; warning: number; overdue: number };
  upcomingDeadlines: Array<{
    id: string;
    requirementName: string;
    dueDate: string;
    daysRemaining: number;
    status: string;
  }>;
  requirements: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    description: string;
    nextDueDate: string | null;
    checklist: Array<{ step: string; completed: boolean; aiVerified: boolean }>;
    documents: Array<{ id: string; name: string; uploadedAt: string }>;
  }>;
}> {
  return request("/compliance/dashboard");
}

export function assessCompany(): Promise<{ message: string }> {
  return request("/compliance/assess", { method: "POST" });
}

export function updateStatus(statusId: string, data: Record<string, unknown>): Promise<unknown> {
  return request(`/compliance/status/${statusId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function toggleChecklist(
  requirementId: string,
  stepIndex: number,
): Promise<{ checklist: Array<{ step: string; completed: boolean }> }> {
  return request(`/compliance/checklist/${requirementId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ stepIndex }),
  });
}

export function requirements(): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    description: string;
  }>
> {
  return request("/compliance/requirements");
}

export function documents(): Promise<
  Array<{
    id: string;
    name: string;
    requirementId: string | null;
    requirementName: string | null;
    uploadedAt: string;
    size: number;
    url: string;
  }>
> {
  return request("/documents");
}

export function documentsByRequirement(reqId: string): Promise<
  Array<{
    id: string;
    name: string;
    uploadedAt: string;
    size: number;
    url: string;
  }>
> {
  return request(`/documents/requirement/${reqId}`);
}

export function uploadDocument(
  file: File,
  requirementId?: string,
): Promise<{ id: string; name: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (requirementId) {
    formData.append("requirementId", requirementId);
  }

  return fetch(`${BASE_URL}/documents`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    return res.json();
  });
}

export function deleteDocument(id: string): Promise<void> {
  return request(`/documents/${id}`, { method: "DELETE" });
}

export function notifications(): Promise<
  Array<{
    id: string;
    type: string;
    message: string;
    requirementName: string | null;
    read: boolean;
    createdAt: string;
  }>
> {
  return request("/notifications");
}

export function markNotificationRead(id: string): Promise<void> {
  return request(`/notifications/${id}/read`, { method: "PATCH" });
}

export function updateCompanyProfile(data: Record<string, unknown>): Promise<unknown> {
  return request("/companies/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function bbeeCalculate(
  turnover: number,
  blackOwnershipPercent: number,
): Promise<{
  category: string;
  level: string | null;
  description: string;
  procurementRecognition: number | null;
  requiresVerification: boolean;
}> {
  return request("/bbee/calculate", {
    method: "POST",
    body: JSON.stringify({ turnover, blackOwnershipPercent }),
  });
}

export function bbeeScorecardElements(): Promise<
  Array<{
    element: string;
    weighting: number;
    description: string;
  }>
> {
  return request("/bbee/scorecard-elements");
}

export function minimumWageCheck(hourlyRate: number): Promise<{
  compliant: boolean;
  currentMinimum: number;
  shortfall: number;
  overtimeRate: number;
}> {
  return request("/tax/minimum-wage-check", {
    method: "POST",
    body: JSON.stringify({ hourlyRate }),
  });
}

export function vatAssessment(annualTurnover: number): Promise<{
  status: string;
  threshold: number;
  voluntaryThreshold: number;
  description: string;
}> {
  return request("/tax/vat-assessment", {
    method: "POST",
    body: JSON.stringify({ annualTurnover }),
  });
}

export function turnoverTaxEstimate(annualTurnover: number): Promise<{
  eligible: boolean;
  estimatedTax: number;
  effectiveRate: number;
  corporateTaxComparison: number;
}> {
  return request("/tax/turnover-tax-estimate", {
    method: "POST",
    body: JSON.stringify({ annualTurnover }),
  });
}

export function corporateTaxEstimate(taxableIncome: number): Promise<{
  taxAmount: number;
  effectiveRate: number;
}> {
  return request("/tax/corporate-tax-estimate", {
    method: "POST",
    body: JSON.stringify({ taxableIncome }),
  });
}

export function sdlAssessment(annualPayroll: number): Promise<{
  applicable: boolean;
  annualAmount: number;
  threshold: number;
  description: string;
}> {
  return request("/tax/sdl-assessment", {
    method: "POST",
    body: JSON.stringify({ annualPayroll }),
  });
}

export function uifCalculation(monthlyRemuneration: number): Promise<{
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  capped: boolean;
}> {
  return request("/tax/uif-calculation", {
    method: "POST",
    body: JSON.stringify({ monthlyRemuneration }),
  });
}

export function taxCalendar(financialYearEndMonth: number): Promise<
  Array<{
    name: string;
    date: string;
    type: string;
    description: string;
  }>
> {
  return request(`/tax/calendar?financialYearEndMonth=${financialYearEndMonth}`);
}

export function templatesList(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    fields: Array<{ name: string; label: string; type: string }>;
  }>
> {
  return request("/templates");
}

export function generateTemplate(
  templateId: string,
  data: Record<string, string>,
): Promise<{ html: string }> {
  return request("/templates/generate", {
    method: "POST",
    body: JSON.stringify({ templateId, data }),
  });
}

export function notificationPreferences(): Promise<{
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
  weeklyDigest: boolean;
  phoneNumber: string | null;
}> {
  return request("/notifications/preferences");
}

export function updateNotificationPreferences(data: Record<string, unknown>): Promise<unknown> {
  return request("/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function companyProfile(): Promise<{
  name: string;
  registrationNumber: string | null;
  financialYearEndMonth: number | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
}> {
  return request("/companies/profile");
}

export function advisorClients(): Promise<
  Array<{
    companyId: number;
    companyName: string;
    complianceScore: number;
    overdueCount: number;
    warningCount: number;
    lastActivity: string | null;
  }>
> {
  return request("/advisor/clients");
}

export function advisorDashboard(): Promise<{
  totalClients: number;
  totalOverdue: number;
  totalWarnings: number;
  averageScore: number;
  clients: Array<{
    companyId: number;
    companyName: string;
    complianceScore: number;
    overdueCount: number;
    warningCount: number;
    lastActivity: string | null;
  }>;
}> {
  return request("/advisor/dashboard");
}

export function advisorCalendar(
  month: number,
  year: number,
): Promise<
  Array<{
    date: string;
    companyName: string;
    companyId: number;
    requirementName: string;
    status: string;
    daysRemaining: number;
  }>
> {
  return request(`/advisor/calendar?month=${month}&year=${year}`);
}

export function addAdvisorClient(companyId: number): Promise<{ message: string }> {
  return request("/advisor/clients", {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}

export function removeAdvisorClient(companyId: number): Promise<void> {
  return request(`/advisor/clients/${companyId}`, { method: "DELETE" });
}

export function aiChat(question: string): Promise<{
  answer: string;
  relatedRequirements: Array<{ id: string; name: string }>;
}> {
  return request("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function tenderChecklist(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    uploaded: boolean;
    documentId: string | null;
    documentUrl: string | null;
  }>
> {
  return request("/tender/checklist");
}

export function tenderScore(): Promise<{
  score: number;
  totalDocuments: number;
  uploadedDocuments: number;
}> {
  return request("/tender/score");
}

export function regulatoryUpdates(limit?: number): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    effectiveDate: string;
    sourceUrl: string | null;
    affectedAreas: string[];
  }>
> {
  const query = limit ? `?limit=${limit}` : "";
  return request(`/regulatory/updates${query}`);
}

export function regulatoryUpdatesByCategory(category: string): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    effectiveDate: string;
    sourceUrl: string | null;
    affectedAreas: string[];
  }>
> {
  return request(`/regulatory/updates/category/${category}`);
}

export function subscriptionStatus(): Promise<{
  tier: string;
  status: string;
  trialDaysRemaining: number | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  requirementsTracked: number;
  documentsStored: number;
  clientsManaged: number;
}> {
  return request("/subscriptions/status");
}

export function upgradeSubscription(tier: string): Promise<{ message: string }> {
  return request("/subscriptions/upgrade", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

export function cancelSubscription(): Promise<{ message: string }> {
  return request("/subscriptions/cancel", { method: "POST" });
}

export function apiKeysList(): Promise<
  Array<{
    id: number;
    name: string;
    keyPreview: string;
    createdAt: string;
    lastUsedAt: string | null;
    status: string;
  }>
> {
  return request("/api-keys");
}

export function generateApiKey(name: string): Promise<{ id: number; name: string; key: string }> {
  return request("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeApiKey(id: number): Promise<void> {
  return request(`/api-keys/${id}`, { method: "DELETE" });
}

export function healthReport(): Promise<{ html: string }> {
  return request("/templates/health-report");
}

export function integrationsList(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    category: string;
  }>
> {
  return request("/integrations");
}

export function integrationStatus(
  id: string,
): Promise<{ id: string; name: string; status: string; lastSync: string | null }> {
  return request(`/integrations/${id}/status`);
}

export function setaGrantInfo(): Promise<{
  overview: string;
  grants: Array<{
    type: string;
    percentage: number | null;
    description: string;
    eligibility: string;
  }>;
  deadlines: Array<{ name: string; date: string; description: string }>;
  steps: string[];
}> {
  return request("/tax/seta-grants");
}
