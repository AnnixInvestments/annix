import { PortalTokenStore } from "./portalTokenStore";

export const adminTokenStore = new PortalTokenStore({
  accessToken: "adminAccessToken",
  refreshToken: "adminRefreshToken",
});

export const customerTokenStore = new PortalTokenStore({
  accessToken: "customerAccessToken",
  refreshToken: "customerRefreshToken",
});

export const supplierTokenStore = new PortalTokenStore({
  accessToken: "supplierAccessToken",
  refreshToken: "supplierRefreshToken",
});

export const stockControlTokenStore = new PortalTokenStore({
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
});

export const auRubberTokenStore = new PortalTokenStore({
  accessToken: "auRubberAccessToken",
  refreshToken: "auRubberRefreshToken",
});

export const teacherAssistantTokenStore = new PortalTokenStore({
  accessToken: "teacherAssistantAccessToken",
  refreshToken: "teacherAssistantRefreshToken",
});

export const annixRepTokenStore = new PortalTokenStore({
  accessToken: "annixRepAccessToken",
  refreshToken: "annixRepRefreshToken",
});

export const cvAssistantTokenStore = new PortalTokenStore({
  accessToken: "cvAssistantAccessToken",
  refreshToken: "cvAssistantRefreshToken",
});
