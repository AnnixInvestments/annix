import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import {
  CrmConfig,
  CrmType,
  Meeting,
  MeetingRecording,
  MeetingTranscript,
  Prospect,
} from "../entities";
import {
  HubSpotOAuthProvider,
  PipedriveOAuthProvider,
  SalesforceOAuthProvider,
} from "../providers";
import { CrmService } from "./crm.service";

jest.mock("../../secure-documents/crypto.util", () => ({
  encrypt: jest.fn().mockReturnValue(Buffer.from("encrypted")),
  decrypt: jest.fn().mockReturnValue(Buffer.from("decrypted-token")),
}));

describe("CrmService", () => {
  let service: CrmService;
  let mockCrmConfigRepo: Partial<Repository<CrmConfig>>;
  let mockProspectRepo: Partial<Repository<Prospect>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockTranscriptRepo: Partial<Repository<MeetingTranscript>>;
  let mockConfigService: Partial<ConfigService>;
  let mockSalesforceProvider: Partial<SalesforceOAuthProvider>;
  let mockHubspotProvider: Partial<HubSpotOAuthProvider>;
  let mockPipedriveProvider: Partial<PipedriveOAuthProvider>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockCrmConfig: CrmConfig = {
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
    apiSecretEncrypted: null,
    instanceUrl: null,
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    crmUserId: null,
    crmOrganizationId: null,
    prospectFieldMappings: null,
    meetingFieldMappings: null,
    syncProspects: true,
    syncMeetings: true,
    syncOnCreate: true,
    syncOnUpdate: true,
    conflictResolution: "manual" as any,
    lastPullSyncToken: null,
    lastSyncAt: null,
    lastSyncError: null,
    createdAt: testDate,
    updatedAt: testDate,
    user: undefined as any,
  };

  const mockProspect: Prospect = {
    id: 1,
    ownerId: 100,
    companyName: "Test Company",
    contactName: "John Doe",
    email: "john@example.com",
    phone: "+27123456789",
    crmExternalId: null,
  } as any;

  beforeEach(async () => {
    mockCrmConfigRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockProspectRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
    };

    mockMeetingRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
    };

    mockRecordingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockTranscriptRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TOKEN_ENCRYPTION_KEY: "test-encryption-key",
        };
        return config[key] ?? null;
      }),
    };

    mockSalesforceProvider = {
      oauthUrl: jest.fn().mockReturnValue("https://login.salesforce.com/oauth"),
      exchangeCode: jest.fn().mockResolvedValue({
        accessToken: "sf-access-token",
        refreshToken: "sf-refresh-token",
        expiresIn: 3600,
        instanceUrl: "https://my.salesforce.com",
      }),
      userInfo: jest.fn().mockResolvedValue({
        id: "sf-user-1",
        organizationId: "sf-org-1",
      }),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    mockHubspotProvider = {
      oauthUrl: jest.fn().mockReturnValue("https://app.hubspot.com/oauth"),
      exchangeCode: jest.fn().mockResolvedValue({
        accessToken: "hs-access-token",
        refreshToken: "hs-refresh-token",
        expiresIn: 3600,
        instanceUrl: null,
      }),
      userInfo: jest.fn().mockResolvedValue({
        id: "hs-user-1",
        organizationId: "hs-org-1",
      }),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    mockPipedriveProvider = {
      oauthUrl: jest.fn().mockReturnValue("https://oauth.pipedrive.com/oauth"),
      exchangeCode: jest.fn().mockResolvedValue({
        accessToken: "pd-access-token",
        refreshToken: "pd-refresh-token",
        expiresIn: 3600,
        instanceUrl: null,
      }),
      userInfo: jest.fn().mockResolvedValue({
        id: "pd-user-1",
        organizationId: null,
      }),
      revokeToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: getRepositoryToken(CrmConfig), useValue: mockCrmConfigRepo },
        { provide: getRepositoryToken(Prospect), useValue: mockProspectRepo },
        { provide: getRepositoryToken(Meeting), useValue: mockMeetingRepo },
        { provide: getRepositoryToken(MeetingRecording), useValue: mockRecordingRepo },
        { provide: getRepositoryToken(MeetingTranscript), useValue: mockTranscriptRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SalesforceOAuthProvider, useValue: mockSalesforceProvider },
        { provide: HubSpotOAuthProvider, useValue: mockHubspotProvider },
        { provide: PipedriveOAuthProvider, useValue: mockPipedriveProvider },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("oauthUrl", () => {
    it("should return Salesforce OAuth URL", () => {
      const url = service.oauthUrl(CrmType.SALESFORCE, "http://localhost/callback", "state-123");

      expect(url).toBe("https://login.salesforce.com/oauth");
      expect(mockSalesforceProvider.oauthUrl).toHaveBeenCalledWith(
        "http://localhost/callback",
        "state-123",
      );
    });

    it("should return HubSpot OAuth URL", () => {
      const url = service.oauthUrl(CrmType.HUBSPOT, "http://localhost/callback", "state-123");

      expect(url).toBe("https://app.hubspot.com/oauth");
      expect(mockHubspotProvider.oauthUrl).toHaveBeenCalledWith(
        "http://localhost/callback",
        "state-123",
      );
    });

    it("should return Pipedrive OAuth URL", () => {
      const url = service.oauthUrl(CrmType.PIPEDRIVE, "http://localhost/callback", "state-123");

      expect(url).toBe("https://oauth.pipedrive.com/oauth");
    });

    it("should throw for unsupported OAuth provider", () => {
      expect(() =>
        service.oauthUrl(CrmType.WEBHOOK, "http://localhost/callback", "state-123"),
      ).toThrow("OAuth not supported for webhook");
    });
  });

  describe("handleOAuthCallback", () => {
    it("should exchange code and create new config for Salesforce", async () => {
      const result = await service.handleOAuthCallback(
        100,
        CrmType.SALESFORCE,
        "auth-code",
        "http://localhost/callback",
      );

      expect(mockSalesforceProvider.exchangeCode).toHaveBeenCalledWith(
        "auth-code",
        "http://localhost/callback",
      );
      expect(mockCrmConfigRepo.create).toHaveBeenCalled();
      expect(mockCrmConfigRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("id");
    });

    it("should update existing config when one exists for user and provider", async () => {
      const existingConfig = { ...mockCrmConfig, crmType: CrmType.SALESFORCE };
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(existingConfig);

      await service.handleOAuthCallback(
        100,
        CrmType.SALESFORCE,
        "auth-code",
        "http://localhost/callback",
      );

      expect(mockCrmConfigRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(mockCrmConfigRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("disconnectOAuth", () => {
    it("should revoke token and deactivate config", async () => {
      const config = {
        ...mockCrmConfig,
        crmType: CrmType.SALESFORCE,
        apiKeyEncrypted: "encrypted-token",
      };
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(config);

      await service.disconnectOAuth(100, 1);

      expect(mockSalesforceProvider.revokeToken).toHaveBeenCalled();
      expect(mockCrmConfigRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyEncrypted: null,
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
          isActive: false,
        }),
      );
    });

    it("should not revoke token when no access token exists", async () => {
      const config = { ...mockCrmConfig, apiKeyEncrypted: null };
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(config);

      await service.disconnectOAuth(100, 1);

      expect(mockSalesforceProvider.revokeToken).not.toHaveBeenCalled();
      expect(mockCrmConfigRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when config does not exist", async () => {
      await expect(service.disconnectOAuth(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("listConfigs", () => {
    it("should return configs for user", async () => {
      (mockCrmConfigRepo.find as jest.Mock).mockResolvedValue([mockCrmConfig]);

      const result = await service.listConfigs(100);

      expect(result).toHaveLength(1);
      expect(mockCrmConfigRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when no configs exist", async () => {
      const result = await service.listConfigs(100);

      expect(result).toEqual([]);
    });
  });

  describe("configById", () => {
    it("should return config when found", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);

      const result = await service.configById(100, 1);

      expect(result.id).toBe(1);
      expect(result.name).toBe("Test CRM");
    });

    it("should throw NotFoundException when config does not exist", async () => {
      await expect(service.configById(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("createConfig", () => {
    it("should create a new CRM config", async () => {
      const dto = {
        name: "My Webhook",
        crmType: CrmType.WEBHOOK,
        webhookConfig: {
          url: "https://example.com/hook",
          method: "POST" as const,
          headers: {},
          authType: "none" as const,
          authValue: null,
        },
      };

      const result = await service.createConfig(100, dto);

      expect(mockCrmConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          name: "My Webhook",
          crmType: CrmType.WEBHOOK,
          isActive: true,
        }),
      );
      expect(mockCrmConfigRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("id");
    });

    it("should encrypt API key when provided", async () => {
      const dto = {
        name: "API CRM",
        crmType: CrmType.WEBHOOK,
        apiKey: "secret-api-key",
      };

      await service.createConfig(100, dto);

      expect(mockCrmConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyEncrypted: expect.any(String),
        }),
      );
    });
  });

  describe("updateConfig", () => {
    it("should update config fields", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue({ ...mockCrmConfig });

      const dto = { name: "Updated CRM", isActive: false };
      const result = await service.updateConfig(100, 1, dto);

      expect(mockCrmConfigRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when config does not exist", async () => {
      await expect(service.updateConfig(100, 999, { name: "Updated" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should only update provided fields", async () => {
      const config = { ...mockCrmConfig };
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(config);

      await service.updateConfig(100, 1, { name: "New Name" });

      expect(mockCrmConfigRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
          crmType: CrmType.WEBHOOK,
        }),
      );
    });
  });

  describe("deleteConfig", () => {
    it("should delete config", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);

      await service.deleteConfig(100, 1);

      expect(mockCrmConfigRepo.remove).toHaveBeenCalledWith(mockCrmConfig);
    });

    it("should throw NotFoundException when config does not exist", async () => {
      await expect(service.deleteConfig(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncProspect", () => {
    it("should throw NotFoundException when prospect does not exist", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);

      await expect(service.syncProspect(100, 1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncMeeting", () => {
    it("should throw NotFoundException when meeting does not exist", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);

      await expect(service.syncMeeting(100, 1, 999)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when meeting has no prospect", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        salesRepId: 100,
        prospect: null,
      });

      await expect(service.syncMeeting(100, 1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncStatus", () => {
    it("should return sync status for config", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);
      (mockProspectRepo.count as jest.Mock).mockResolvedValueOnce(5).mockResolvedValueOnce(10);
      (mockMeetingRepo.count as jest.Mock).mockResolvedValueOnce(3).mockResolvedValueOnce(8);

      const result = await service.syncStatus(100, 1);

      expect(result).toEqual({
        configId: 1,
        isActive: true,
        lastSyncAt: null,
        prospectsSynced: 5,
        meetingsSynced: 3,
        pendingSync: 10,
        failedSync: 0,
      });
    });

    it("should report failed sync when lastSyncError is set", async () => {
      const configWithError = { ...mockCrmConfig, lastSyncError: "Connection timed out" };
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(configWithError);
      (mockProspectRepo.count as jest.Mock).mockResolvedValue(0);
      (mockMeetingRepo.count as jest.Mock).mockResolvedValue(0);

      const result = await service.syncStatus(100, 1);

      expect(result.failedSync).toBe(1);
    });

    it("should throw NotFoundException when config does not exist", async () => {
      await expect(service.syncStatus(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("exportProspectsCsv", () => {
    it("should export prospects without config", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.exportProspectsCsv(100, null);

      expect(typeof result).toBe("string");
      expect(mockProspectRepo.find).toHaveBeenCalledWith({
        where: { ownerId: 100 },
        order: { createdAt: "DESC" },
      });
    });

    it("should export prospects with config field mappings", async () => {
      (mockCrmConfigRepo.findOne as jest.Mock).mockResolvedValue(mockCrmConfig);
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.exportProspectsCsv(100, 1);

      expect(typeof result).toBe("string");
    });
  });

  describe("exportMeetingsCsv", () => {
    it("should export meetings without config", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.exportMeetingsCsv(100, null);

      expect(typeof result).toBe("string");
    });
  });
});
