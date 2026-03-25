import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { CrmType } from "../entities";
import { CrmService } from "../services/crm.service";
import { CrmSyncService } from "../services/crm-sync.service";
import { CrmController } from "./crm.controller";

describe("CrmController", () => {
  let controller: CrmController;
  let crmService: jest.Mocked<CrmService>;
  let crmSyncService: jest.Mocked<CrmSyncService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  } as any;

  const mockCrmConfig = {
    id: 1,
    userId: 100,
    name: "Test CRM",
    crmType: CrmType.WEBHOOK,
    isActive: true,
    webhookConfig: {
      url: "https://example.com/webhook",
      method: "POST",
      headers: {},
      authType: "none",
      authValue: null,
    },
    apiKeyEncrypted: null,
    instanceUrl: null,
    crmUserId: null,
    crmOrganizationId: null,
    tokenExpiresAt: null,
    prospectFieldMappings: null,
    meetingFieldMappings: null,
    syncProspects: true,
    syncMeetings: true,
    syncOnCreate: true,
    syncOnUpdate: true,
    lastSyncAt: null,
    lastSyncError: null,
    createdAt: testDate,
    updatedAt: testDate,
  };

  const mockSyncLog = {
    id: 1,
    configId: 1,
    direction: "push",
    status: "completed",
    recordsProcessed: 10,
    recordsSucceeded: 9,
    recordsFailed: 1,
    errorDetails: null,
    startedAt: testDate,
    completedAt: testDate,
  };

  beforeEach(async () => {
    const mockCrmService = {
      listConfigs: jest.fn(),
      configById: jest.fn(),
      createConfig: jest.fn(),
      updateConfig: jest.fn(),
      deleteConfig: jest.fn(),
      testConnection: jest.fn(),
      syncProspect: jest.fn(),
      syncMeeting: jest.fn(),
      syncAllProspects: jest.fn(),
      syncStatus: jest.fn(),
      exportProspectsCsv: jest.fn(),
      exportMeetingsCsv: jest.fn(),
      oauthUrl: jest.fn(),
      handleOAuthCallback: jest.fn(),
      disconnectOAuth: jest.fn(),
    };

    const mockCrmSyncService = {
      syncIncrementally: jest.fn(),
      pullAllContacts: jest.fn(),
      syncLogs: jest.fn(),
      refreshTokenIfNeeded: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [
        { provide: CrmService, useValue: mockCrmService },
        { provide: CrmSyncService, useValue: mockCrmSyncService },
      ],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CrmController>(CrmController);
    crmService = module.get(CrmService);
    crmSyncService = module.get(CrmSyncService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listConfigs", () => {
    it("should return configs mapped to response DTOs", async () => {
      crmService.listConfigs.mockResolvedValue([mockCrmConfig] as any);

      const result = await controller.listConfigs(mockRequest);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[0]).toHaveProperty("name", "Test CRM");
      expect(result[0]).toHaveProperty("isConnected");
      expect(crmService.listConfigs).toHaveBeenCalledWith(100);
    });

    it("should return empty array when no configs exist", async () => {
      crmService.listConfigs.mockResolvedValue([]);

      const result = await controller.listConfigs(mockRequest);

      expect(result).toEqual([]);
    });
  });

  describe("configById", () => {
    it("should return config mapped to response DTO", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);

      const result = await controller.configById(mockRequest, 1);

      expect(result.id).toBe(1);
      expect(result.crmType).toBe(CrmType.WEBHOOK);
      expect(crmService.configById).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("createConfig", () => {
    it("should create config and return response DTO", async () => {
      const dto = { name: "New CRM", crmType: CrmType.WEBHOOK };
      crmService.createConfig.mockResolvedValue(mockCrmConfig as any);

      const result = await controller.createConfig(mockRequest, dto as any);

      expect(result.id).toBe(1);
      expect(crmService.createConfig).toHaveBeenCalledWith(100, dto);
    });
  });

  describe("updateConfig", () => {
    it("should update config and return response DTO", async () => {
      const dto = { name: "Updated CRM" };
      crmService.updateConfig.mockResolvedValue({ ...mockCrmConfig, name: "Updated CRM" } as any);

      const result = await controller.updateConfig(mockRequest, 1, dto as any);

      expect(result.name).toBe("Updated CRM");
      expect(crmService.updateConfig).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("deleteConfig", () => {
    it("should delete config", async () => {
      crmService.deleteConfig.mockResolvedValue(undefined);

      await controller.deleteConfig(mockRequest, 1);

      expect(crmService.deleteConfig).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("testConnection", () => {
    it("should test connection and return result", async () => {
      crmService.testConnection.mockResolvedValue({ success: true, message: "Connected" });

      const result = await controller.testConnection(mockRequest, 1);

      expect(result).toEqual({ success: true, message: "Connected" });
      expect(crmService.testConnection).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("syncProspect", () => {
    it("should sync prospect and return success result", async () => {
      crmService.syncProspect.mockResolvedValue({
        success: true,
        externalId: "ext-123",
        timestamp: testDate,
      });

      const result = await controller.syncProspect(mockRequest, 1, 42);

      expect(result).toEqual({
        success: true,
        message: "Synced successfully",
        externalId: "ext-123",
        error: null,
      });
    });

    it("should return error result on sync failure", async () => {
      crmService.syncProspect.mockResolvedValue({
        success: false,
        error: "Connection refused",
        timestamp: testDate,
      });

      const result = await controller.syncProspect(mockRequest, 1, 42);

      expect(result).toEqual({
        success: false,
        message: null,
        externalId: null,
        error: "Connection refused",
      });
    });
  });

  describe("syncMeeting", () => {
    it("should sync meeting and return result", async () => {
      crmService.syncMeeting.mockResolvedValue({
        success: true,
        externalId: "meeting-ext-1",
        timestamp: testDate,
      });

      const result = await controller.syncMeeting(mockRequest, 1, 10);

      expect(result).toEqual({
        success: true,
        message: "Synced successfully",
        externalId: "meeting-ext-1",
        error: null,
      });
    });
  });

  describe("syncAllProspects", () => {
    it("should sync all prospects and return counts", async () => {
      crmService.syncAllProspects.mockResolvedValue({ synced: 8, failed: 2 });

      const result = await controller.syncAllProspects(mockRequest, 1);

      expect(result).toEqual({ synced: 8, failed: 2 });
      expect(crmService.syncAllProspects).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("syncStatus", () => {
    it("should return sync status", async () => {
      const status = {
        configId: 1,
        isActive: true,
        lastSyncAt: null,
        prospectsSynced: 5,
        meetingsSynced: 3,
        pendingSync: 10,
        failedSync: 0,
      };
      crmService.syncStatus.mockResolvedValue(status);

      const result = await controller.syncStatus(mockRequest, 1);

      expect(result).toEqual(status);
    });
  });

  describe("exportProspects", () => {
    it("should export CSV and send via response", async () => {
      crmService.exportProspectsCsv.mockResolvedValue("name,email\nJohn,john@example.com");
      const mockRes = { send: jest.fn() } as any;

      await controller.exportProspects(mockRequest, undefined, mockRes);

      expect(crmService.exportProspectsCsv).toHaveBeenCalledWith(100, null);
      expect(mockRes.send).toHaveBeenCalledWith("name,email\nJohn,john@example.com");
    });

    it("should pass configId when provided", async () => {
      crmService.exportProspectsCsv.mockResolvedValue("");
      const mockRes = { send: jest.fn() } as any;

      await controller.exportProspects(mockRequest, "5", mockRes);

      expect(crmService.exportProspectsCsv).toHaveBeenCalledWith(100, 5);
    });
  });

  describe("exportMeetings", () => {
    it("should export meetings CSV", async () => {
      crmService.exportMeetingsCsv.mockResolvedValue("subject,date\nMeeting,2026-01-15");
      const mockRes = { send: jest.fn() } as any;

      await controller.exportMeetings(mockRequest, undefined, mockRes);

      expect(crmService.exportMeetingsCsv).toHaveBeenCalledWith(100, null);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe("oauthUrl", () => {
    it("should return OAuth URL for salesforce provider", async () => {
      crmService.oauthUrl.mockReturnValue("https://login.salesforce.com/oauth?state=abc");

      const result = await controller.oauthUrl(
        "salesforce",
        "http://localhost/callback",
        mockRequest,
      );

      expect(result).toHaveProperty("url");
      expect(crmService.oauthUrl).toHaveBeenCalledWith(
        CrmType.SALESFORCE,
        "http://localhost/callback",
        expect.any(String),
      );
    });

    it("should throw BadRequestException for unknown provider", async () => {
      await expect(
        controller.oauthUrl("unknown", "http://localhost/callback", mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("oauthCallback", () => {
    it("should handle OAuth callback and return config response", async () => {
      crmService.handleOAuthCallback.mockResolvedValue(mockCrmConfig as any);

      const result = await controller.oauthCallback(
        "hubspot",
        "auth-code-123",
        "http://localhost/callback",
        mockRequest,
      );

      expect(result.id).toBe(1);
      expect(crmService.handleOAuthCallback).toHaveBeenCalledWith(
        100,
        CrmType.HUBSPOT,
        "auth-code-123",
        "http://localhost/callback",
      );
    });

    it("should throw BadRequestException when code is missing", async () => {
      await expect(
        controller.oauthCallback("hubspot", "", "http://localhost/callback", mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("disconnect", () => {
    it("should disconnect OAuth and return success", async () => {
      crmService.disconnectOAuth.mockResolvedValue(undefined);

      const result = await controller.disconnect(mockRequest, 1);

      expect(result).toEqual({ success: true });
      expect(crmService.disconnectOAuth).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("syncNow", () => {
    it("should trigger incremental sync and return log", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);
      crmSyncService.syncIncrementally.mockResolvedValue(mockSyncLog as any);

      const result = await controller.syncNow(mockRequest, 1);

      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("direction", "push");
      expect(result).toHaveProperty("status", "completed");
      expect(crmService.configById).toHaveBeenCalledWith(100, 1);
      expect(crmSyncService.syncIncrementally).toHaveBeenCalledWith(1);
    });
  });

  describe("pullAll", () => {
    it("should pull all contacts and return log", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);
      crmSyncService.pullAllContacts.mockResolvedValue(mockSyncLog as any);

      const result = await controller.pullAll(mockRequest, 1);

      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("recordsProcessed", 10);
      expect(crmSyncService.pullAllContacts).toHaveBeenCalledWith(1);
    });
  });

  describe("syncLogs", () => {
    it("should return paginated sync logs", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);
      crmSyncService.syncLogs.mockResolvedValue({
        logs: [mockSyncLog] as any,
        total: 1,
      });

      const result = await controller.syncLogs(mockRequest, 1, "10", "0");

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(crmSyncService.syncLogs).toHaveBeenCalledWith(1, 10, 0);
    });

    it("should use default pagination values", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);
      crmSyncService.syncLogs.mockResolvedValue({ logs: [], total: 0 });

      await controller.syncLogs(mockRequest, 1);

      expect(crmSyncService.syncLogs).toHaveBeenCalledWith(1, 20, 0);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token and return success", async () => {
      crmService.configById.mockResolvedValue(mockCrmConfig as any);
      crmSyncService.refreshTokenIfNeeded.mockResolvedValue(undefined);

      const result = await controller.refreshToken(mockRequest, 1);

      expect(result).toEqual({ success: true });
      expect(crmSyncService.refreshTokenIfNeeded).toHaveBeenCalledWith(1);
    });
  });
});
