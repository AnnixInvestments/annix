import { fromISO } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import type { CrmAdapterConfig } from "./crm-adapter.interface";
import { WebhookCrmAdapter } from "./webhook-crm.adapter";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("WebhookCrmAdapter", () => {
  let adapter: WebhookCrmAdapter;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const webhookConfig: CrmAdapterConfig = {
    type: "webhook",
    name: "Test Webhook",
    enabled: true,
    webhookUrl: "https://hooks.example.com/crm",
    webhookHeaders: { "X-Api-Key": "secret-key" },
    webhookMethod: "POST",
    fieldMappings: [],
    syncContacts: true,
    syncMeetings: true,
    autoSync: false,
  };

  const mockProspect: Partial<Prospect> = {
    id: 1,
    companyName: "Acme Corp",
    contactName: "John Smith",
    contactEmail: "john@acme.com",
    contactPhone: "+27821234567",
    contactTitle: null,
    streetAddress: "123 Main St",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2000",
    country: "South Africa",
    notes: null,
    status: "new" as any,
    score: 50,
    crmExternalId: null,
    customFields: { industry: "manufacturing" },
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    title: "Intro Call",
    description: "Initial discussion",
    notes: null,
    outcomes: null,
    actionItems: null,
    scheduledStart: testDate,
    scheduledEnd: fromISO("2026-01-15T10:30:00Z").toJSDate(),
    actualEnd: null,
    location: "Zoom",
    crmExternalId: null,
    status: "scheduled" as any,
    meetingType: "video" as any,
    prospect: mockProspect as any,
  };

  beforeEach(() => {
    adapter = new WebhookCrmAdapter();
    adapter.configure(webhookConfig);
    jest.clearAllMocks();
  });

  it("should have correct type", () => {
    expect(adapter.type).toBe("webhook");
  });

  it("should return configured name", () => {
    expect(adapter.name).toBe("Test Webhook");
  });

  it("should return default name when not configured", () => {
    const unconfigured = new WebhookCrmAdapter();
    expect(unconfigured.name).toBe("Webhook CRM");
  });

  describe("configure", () => {
    it("should throw when config type is not webhook", () => {
      const invalidConfig = { ...webhookConfig, type: "salesforce" as any };
      expect(() => adapter.configure(invalidConfig)).toThrow("Invalid config type");
    });
  });

  describe("syncContact", () => {
    it("should return failure when webhook URL not configured", async () => {
      const unconfigured = new WebhookCrmAdapter();
      const result = await unconfigured.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook URL not configured");
    });

    it("should send create action for new contact", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "webhook-123" }),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("webhook-123");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("contact");
      expect(body.action).toBe("create");
      expect(body.timestamp).toBeDefined();
    });

    it("should send update action for existing contact", async () => {
      const existing = { ...mockProspect, crmExternalId: "ext-123" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "ext-123" }),
      });

      const result = await adapter.syncContact(existing as Prospect);

      expect(result.success).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.action).toBe("update");
    });

    it("should include custom headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncContact(mockProspect as Prospect);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-Api-Key"]).toBe("secret-key");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should handle HTTP error response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve("Validation error"),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 422: Validation error");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
    });

    it("should handle response with no JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("No JSON")),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
    });
  });

  describe("syncMeeting", () => {
    it("should return failure when webhook URL not configured", async () => {
      const unconfigured = new WebhookCrmAdapter();
      const result = await unconfigured.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook URL not configured");
    });

    it("should send meeting data with contact info", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "meeting-456" }),
      });

      const result = await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("meeting-456");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("meeting");
      expect(body.action).toBe("create");
      expect(body.contact).toBeDefined();
      expect(body.contact.companyName).toBe("Acme Corp");
    });

    it("should send update action for existing meeting", async () => {
      const existing = { ...mockMeeting, crmExternalId: "ext-meeting-1" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "ext-meeting-1" }),
      });

      await adapter.syncMeeting(existing as Meeting, mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.action).toBe("update");
    });

    it("should handle HTTP error on meeting sync", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal server error"),
      });

      const result = await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 500: Internal server error");
    });

    it("should use configured HTTP method", async () => {
      const putConfig = { ...webhookConfig, webhookMethod: "PUT" as const };
      adapter.configure(putConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
    });
  });

  describe("testConnection", () => {
    it("should return failure when webhook URL not configured", async () => {
      const unconfigured = new WebhookCrmAdapter();
      const result = await unconfigured.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Webhook URL not configured");
    });

    it("should send test ping", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connection successful");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("test");
      expect(body.action).toBe("ping");
    });

    it("should return failure on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("HTTP 403: Forbidden");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Connection refused");
    });
  });

  describe("field mappings", () => {
    it("should apply field mappings to contact data", async () => {
      const mappedConfig: CrmAdapterConfig = {
        ...webhookConfig,
        fieldMappings: [
          { sourceField: "companyName", targetField: "organization_name" },
          { sourceField: "email", targetField: "contact_email", transform: "lowercase" },
        ],
      };
      adapter.configure(mappedConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncContact(mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.data.organization_name).toBe("Acme Corp");
    });

    it("should pass unmapped fields through", async () => {
      const mappedConfig: CrmAdapterConfig = {
        ...webhookConfig,
        fieldMappings: [{ sourceField: "companyName", targetField: "org" }],
      };
      adapter.configure(mappedConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncContact(mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.data.org).toBe("Acme Corp");
      expect(body.data.status).toBe("new");
    });

    it("should apply uppercase transform", async () => {
      const mappedConfig: CrmAdapterConfig = {
        ...webhookConfig,
        fieldMappings: [
          { sourceField: "status", targetField: "crm_status", transform: "uppercase" },
        ],
      };
      adapter.configure(mappedConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncContact(mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.data.crm_status).toBe("NEW");
    });

    it("should apply boolean transform", async () => {
      const mappedConfig: CrmAdapterConfig = {
        ...webhookConfig,
        fieldMappings: [
          { sourceField: "companyName", targetField: "has_company", transform: "boolean" },
        ],
      };
      adapter.configure(mappedConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await adapter.syncContact(mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.data.has_company).toBe(true);
    });
  });
});
