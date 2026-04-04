import { StockControlApiClient } from "./base";
import type {
  AdminTransferAcceptResponse,
  AdminTransferPending,
  CompanyDetailsUpdate,
  CompanyRole,
  InvitationValidation,
  ProcessedBrandingResult,
  ScrapedBrandingCandidates,
  SmtpConfigResponse,
  SmtpConfigUpdate,
  StockControlDepartment,
  StockControlInvitation,
  StockControlLocation,
  StockControlLoginDto,
  StockControlLoginResponse,
  StockControlTeamMember,
  StockControlUser,
  StockControlUserProfile,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    adminBridge(adminToken: string): Promise<StockControlLoginResponse>;
    login(dto: StockControlLoginDto): Promise<StockControlLoginResponse>;
    register(dto: {
      email: string;
      password: string;
      name: string;
      companyName?: string;
      invitationToken?: string;
    }): Promise<{ message: string; user: StockControlUser; isInvitedUser: boolean }>;
    verifyEmail(token: string): Promise<{
      message: string;
      userId: number;
      email: string;
      needsBranding: boolean;
    }>;
    updateCompanyDetails(details: CompanyDetailsUpdate): Promise<{ message: string }>;
    updateCompanyName(name: string): Promise<{ message: string }>;
    scrapeBranding(websiteUrl: string): Promise<ScrapedBrandingCandidates>;
    processBrandingSelection(data: {
      logoSourceUrl?: string;
      heroSourceUrl?: string;
      scrapedPrimaryColor?: string;
    }): Promise<ProcessedBrandingResult>;
    proxyImageUrl(url: string): string;
    setBranding(data: {
      brandingType: string;
      websiteUrl?: string;
      brandingAuthorized?: boolean;
      primaryColor?: string;
      accentColor?: string;
      logoUrl?: string;
      heroImageUrl?: string;
    }): Promise<{ message: string }>;
    forgotPassword(email: string): Promise<{ message: string }>;
    resetPassword(token: string, password: string): Promise<{ message: string }>;
    resendVerification(email: string): Promise<{ message: string }>;
    logout(): Promise<void>;
    currentUser(): Promise<StockControlUserProfile>;
    teamMembers(): Promise<StockControlTeamMember[]>;
    updateMemberRole(userId: number, role: string): Promise<{ message: string }>;
    sendAppLink(userId: number): Promise<{ message: string }>;
    departments(): Promise<StockControlDepartment[]>;
    createDepartment(name: string, displayOrder?: number): Promise<StockControlDepartment>;
    updateDepartment(
      id: number,
      data: { name?: string; displayOrder?: number | null; active?: boolean },
    ): Promise<StockControlDepartment>;
    deleteDepartment(id: number): Promise<void>;
    locations(): Promise<StockControlLocation[]>;
    createLocation(
      name: string,
      description?: string,
      displayOrder?: number,
    ): Promise<StockControlLocation>;
    updateLocation(
      id: number,
      data: {
        name?: string;
        description?: string | null;
        displayOrder?: number | null;
        active?: boolean;
      },
    ): Promise<StockControlLocation>;
    deleteLocation(id: number): Promise<void>;
    companyInvitations(): Promise<StockControlInvitation[]>;
    createInvitation(email: string, role: string): Promise<StockControlInvitation>;
    cancelInvitation(id: number): Promise<{ message: string }>;
    resendInvitation(id: number): Promise<StockControlInvitation>;
    validateInvitation(token: string): Promise<InvitationValidation>;
    updateLinkedStaff(linkedStaffId: number | null): Promise<{ linkedStaffId: number | null }>;
    smtpConfig(): Promise<SmtpConfigResponse>;
    updateSmtpConfig(dto: SmtpConfigUpdate): Promise<{ message: string }>;
    testSmtpConfig(): Promise<{ message: string }>;
    navRbacConfig(): Promise<Record<string, string[]>>;
    updateNavRbacConfig(config: Record<string, string[]>): Promise<Record<string, string[]>>;
    actionPermissions(): Promise<{
      config: Record<string, string[]>;
      labels: Record<string, { group: string; label: string }>;
    }>;
    updateActionPermissions(config: Record<string, string[]>): Promise<{
      config: Record<string, string[]>;
      labels: Record<string, { group: string; label: string }>;
    }>;
    initiateAdminTransfer(
      targetEmail: string,
      newRoleForInitiator: string | null,
    ): Promise<{ message: string }>;
    pendingAdminTransfer(): Promise<AdminTransferPending | null>;
    cancelAdminTransfer(id: number): Promise<{ message: string }>;
    resendAdminTransfer(): Promise<{ message: string }>;
    acceptAdminTransfer(token: string): Promise<AdminTransferAcceptResponse>;
    companyRoles(): Promise<CompanyRole[]>;
    createCompanyRole(key: string, label: string): Promise<CompanyRole>;
    updateCompanyRole(id: number, label: string): Promise<CompanyRole>;
    deleteCompanyRole(id: number): Promise<void>;
    reorderCompanyRoles(orderedIds: number[]): Promise<CompanyRole[]>;
    updateTooltipPreference(hideTooltips: boolean): Promise<{ hideTooltips: boolean }>;
    updateNotificationPreferences(prefs: {
      emailNotificationsEnabled?: boolean;
      pushNotificationsEnabled?: boolean;
    }): Promise<{ emailNotificationsEnabled: boolean; pushNotificationsEnabled: boolean }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.adminBridge = async function (adminToken) {
  const response = await this.request<StockControlLoginResponse>(
    "/stock-control/auth/admin-bridge",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  this.setTokens(response.accessToken, response.refreshToken);
  return response;
};

proto.login = async function (dto) {
  const response = await this.request<StockControlLoginResponse>("/stock-control/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  this.setTokens(response.accessToken, response.refreshToken);
  return response;
};

proto.register = async function (dto) {
  return this.request("/stock-control/auth/register", {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.verifyEmail = async function (token) {
  const response = await this.request<{
    message: string;
    userId: number;
    email: string;
    needsBranding: boolean;
    accessToken?: string;
    refreshToken?: string;
  }>(`/stock-control/auth/verify-email?token=${encodeURIComponent(token)}`);

  if (response.accessToken && response.refreshToken) {
    this.setTokens(response.accessToken, response.refreshToken);
  }

  return response;
};

proto.updateCompanyDetails = async function (details) {
  return this.request("/stock-control/auth/company-details", {
    method: "PATCH",
    body: JSON.stringify(details),
  });
};

proto.updateCompanyName = async function (name) {
  return this.updateCompanyDetails({ name });
};

proto.scrapeBranding = async function (websiteUrl) {
  return this.request("/stock-control/auth/scrape-branding", {
    method: "POST",
    body: JSON.stringify({ websiteUrl }),
  });
};

proto.processBrandingSelection = async function (data) {
  return this.request("/stock-control/auth/process-branding-selection", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.proxyImageUrl = function (url) {
  return `${this.baseURL}/stock-control/auth/proxy-image?url=${encodeURIComponent(url)}`;
};

proto.setBranding = async function (data) {
  return this.request("/stock-control/auth/set-branding", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.forgotPassword = async function (email) {
  return this.request("/stock-control/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

proto.resetPassword = async function (token, password) {
  return this.request("/stock-control/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
};

proto.resendVerification = async function (email) {
  return this.request("/stock-control/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

proto.logout = async function () {
  try {
    await this.request("/stock-control/auth/logout", { method: "POST" });
  } finally {
    this.clearTokens();
  }
};

proto.currentUser = async function () {
  return this.request<StockControlUserProfile>("/stock-control/auth/me");
};

proto.teamMembers = async function () {
  return this.request("/stock-control/auth/team");
};

proto.updateMemberRole = async function (userId, role) {
  return this.request(`/stock-control/auth/team/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
};

proto.sendAppLink = async function (userId) {
  return this.request(`/stock-control/auth/team/${userId}/send-app-link`, { method: "POST" });
};

proto.departments = async function () {
  return this.request("/stock-control/auth/departments");
};

proto.createDepartment = async function (name, displayOrder) {
  return this.request("/stock-control/auth/departments", {
    method: "POST",
    body: JSON.stringify({ name, displayOrder }),
  });
};

proto.updateDepartment = async function (id, data) {
  return this.request(`/stock-control/auth/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.deleteDepartment = async function (id) {
  return this.request(`/stock-control/auth/departments/${id}`, { method: "DELETE" });
};

proto.locations = async function () {
  return this.request("/stock-control/auth/locations");
};

proto.createLocation = async function (name, description, displayOrder) {
  return this.request("/stock-control/auth/locations", {
    method: "POST",
    body: JSON.stringify({ name, description, displayOrder }),
  });
};

proto.updateLocation = async function (id, data) {
  return this.request(`/stock-control/auth/locations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.deleteLocation = async function (id) {
  return this.request(`/stock-control/auth/locations/${id}`, { method: "DELETE" });
};

proto.companyInvitations = async function () {
  return this.request("/stock-control/invitations");
};

proto.createInvitation = async function (email, role) {
  return this.request("/stock-control/invitations", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
};

proto.cancelInvitation = async function (id) {
  return this.request(`/stock-control/invitations/${id}`, { method: "DELETE" });
};

proto.resendInvitation = async function (id) {
  return this.request(`/stock-control/invitations/${id}/resend`, { method: "POST" });
};

proto.validateInvitation = async function (token) {
  return this.request(`/stock-control/invitations/validate/${encodeURIComponent(token)}`);
};

proto.updateLinkedStaff = async function (linkedStaffId) {
  return this.request("/stock-control/auth/me/linked-staff", {
    method: "PATCH",
    body: JSON.stringify({ linkedStaffId }),
  });
};

proto.smtpConfig = async function () {
  return this.request("/stock-control/auth/smtp-config");
};

proto.updateSmtpConfig = async function (dto) {
  return this.request("/stock-control/auth/smtp-config", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
};

proto.testSmtpConfig = async function () {
  return this.request("/stock-control/auth/smtp-config/test", { method: "POST" });
};

proto.navRbacConfig = async function () {
  return this.request("/stock-control/auth/rbac-config");
};

proto.updateNavRbacConfig = async function (config) {
  return this.request("/stock-control/auth/rbac-config", {
    method: "PATCH",
    body: JSON.stringify({ config }),
  });
};

proto.actionPermissions = async function () {
  return this.request("/stock-control/auth/action-permissions");
};

proto.updateActionPermissions = async function (config) {
  return this.request("/stock-control/auth/action-permissions", {
    method: "PATCH",
    body: JSON.stringify({ config }),
  });
};

proto.initiateAdminTransfer = async function (targetEmail, newRoleForInitiator) {
  return this.request("/stock-control/auth/admin-transfer/initiate", {
    method: "POST",
    body: JSON.stringify({ targetEmail, newRoleForInitiator }),
  });
};

proto.pendingAdminTransfer = async function () {
  return this.request("/stock-control/auth/admin-transfer/pending");
};

proto.cancelAdminTransfer = async function (id) {
  return this.request(`/stock-control/auth/admin-transfer/${id}`, { method: "DELETE" });
};

proto.resendAdminTransfer = async function () {
  return this.request("/stock-control/auth/admin-transfer/resend", { method: "POST" });
};

proto.acceptAdminTransfer = async function (token) {
  return this.request("/stock-control/auth/admin-transfer/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
};

proto.companyRoles = async function () {
  return this.request("/stock-control/auth/roles");
};

proto.createCompanyRole = async function (key, label) {
  return this.request("/stock-control/auth/roles", {
    method: "POST",
    body: JSON.stringify({ key, label }),
  });
};

proto.updateCompanyRole = async function (id, label) {
  return this.request(`/stock-control/auth/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ label }),
  });
};

proto.deleteCompanyRole = async function (id) {
  return this.request(`/stock-control/auth/roles/${id}`, { method: "DELETE" });
};

proto.reorderCompanyRoles = async function (orderedIds) {
  return this.request("/stock-control/auth/roles/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
};

proto.updateTooltipPreference = async function (hideTooltips) {
  return this.request("/stock-control/auth/me/tooltip-preference", {
    method: "PATCH",
    body: JSON.stringify({ hideTooltips }),
  });
};

proto.updateNotificationPreferences = async function (prefs) {
  return this.request("/stock-control/auth/me/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
};
