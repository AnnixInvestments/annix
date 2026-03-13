import { fromISO } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import { HubSpotAdapter } from "./hubspot.adapter";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("HubSpotAdapter", () => {
  let adapter: HubSpotAdapter;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockProspect: Partial<Prospect> = {
    id: 1,
    companyName: "Acme Corp",
    contactName: "John Smith",
    contactEmail: "john@acme.com",
    contactPhone: "+27821234567",
    contactTitle: "Purchasing Manager",
    streetAddress: "123 Main St",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2000",
    country: "South Africa",
    notes: "Key prospect",
    status: "new" as any,
    score: 75,
    crmExternalId: null,
    estimatedValue: 50000,
    customFields: {},
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    title: "Sales Discussion",
    description: "Discuss product requirements",
    notes: "Follow up needed",
    outcomes: "Positive interest",
    actionItems: [{ task: "Send proposal", assignee: "John", dueDate: null }],
    scheduledStart: testDate,
    scheduledEnd: fromISO("2026-01-15T11:00:00Z").toJSDate(),
    location: "Zoom call",
    crmExternalId: null,
    status: "scheduled" as any,
    meetingType: "video" as any,
  };

  beforeEach(() => {
    adapter = new HubSpotAdapter();
    adapter.configure({
      type: "hubspot",
      name: "Test HubSpot",
      enabled: true,
      fieldMappings: [],
      syncContacts: true,
      syncMeetings: true,
      autoSync: false,
    } as any);
    adapter.configureOAuth(
      { accessToken: "test-token", refreshToken: null, instanceUrl: null },
      {
        type: "hubspot",
        name: "Test HubSpot",
        enabled: true,
        fieldMappings: [],
        syncContacts: true,
        syncMeetings: true,
        autoSync: false,
      },
    );
    jest.clearAllMocks();
  });

  it("should have correct type", () => {
    expect(adapter.type).toBe("hubspot");
  });

  it("should return configured name", () => {
    expect(adapter.name).toBe("Test HubSpot");
  });

  it("should return default name when not configured", () => {
    const unconfigured = new HubSpotAdapter();
    expect(unconfigured.name).toBe("HubSpot CRM");
  });

  describe("syncContact", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new HubSpotAdapter();
      const result = await unconfigured.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should create a new contact via POST", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "hubspot-123", properties: {}, createdAt: "", updatedAt: "" }),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("hubspot-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update an existing contact via PATCH", async () => {
      const existingProspect = { ...mockProspect, crmExternalId: "hubspot-123" };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const result = await adapter.syncContact(existingProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("hubspot-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.hubapi.com/crm/v3/objects/contacts/hubspot-123",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should handle API error on create", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ status: "error", message: "Invalid input", correlationId: "abc", category: "VALIDATION_ERROR" }),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("should map prospect status to HubSpot lifecycle stage", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "123", properties: {}, createdAt: "", updatedAt: "" }),
      });

      await adapter.syncContact({ ...mockProspect, status: "qualified" as any } as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.properties.lifecyclestage).toBe("marketingqualifiedlead");
    });

    it("should map score to lead status", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "123", properties: {}, createdAt: "", updatedAt: "" }),
      });

      await adapter.syncContact({ ...mockProspect, score: 85 } as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.properties.hs_lead_status).toBe("QUALIFIED");
    });
  });

  describe("syncMeeting", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new HubSpotAdapter();
      const result = await unconfigured.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should create a new meeting and associate to contact", async () => {
      const prospectWithCrm = { ...mockProspect, crmExternalId: "contact-456" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "meeting-789", properties: {}, createdAt: "", updatedAt: "" }),
        })
        .mockResolvedValueOnce({ ok: true });

      const result = await adapter.syncMeeting(
        mockMeeting as Meeting,
        prospectWithCrm as Prospect,
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("meeting-789");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should update an existing meeting via PATCH", async () => {
      const meetingWithCrm = { ...mockMeeting, crmExternalId: "meeting-789" };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const result = await adapter.syncMeeting(
        meetingWithCrm as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("meeting-789");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.hubapi.com/crm/v3/objects/meetings/meeting-789",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should handle meeting create failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ status: "error", message: "Rate limit", correlationId: "abc", category: "RATE_LIMITS" }),
      });

      const result = await adapter.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate limit");
    });
  });

  describe("pullContacts", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new HubSpotAdapter();
      await expect(unconfigured.pullContacts(null)).rejects.toThrow("HubSpot not configured");
    });

    it("should fetch all contacts without since parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: "1",
                properties: {
                  hs_object_id: "1",
                  firstname: "Jane",
                  lastname: "Doe",
                  email: "jane@example.com",
                  phone: null,
                  jobtitle: null,
                  company: "Test Co",
                  address: null,
                  city: null,
                  state: null,
                  zip: null,
                  country: null,
                  notes: null,
                  lifecyclestage: "lead",
                  hs_lead_status: null,
                  lastmodifieddate: "2026-01-15T10:00:00Z",
                  createdate: "2026-01-01T00:00:00Z",
                },
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-15T10:00:00Z",
              },
            ],
            paging: null,
          }),
      });

      const result = await adapter.pullContacts(null);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].companyName).toBe("Test Co");
      expect(result.contacts[0].contactName).toBe("Jane Doe");
      expect(result.nextSyncToken).toBe("2026-01-15T10:00:00Z");
    });

    it("should use search API when since is provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.pullContacts(testDate);

      expect(result.contacts).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should handle API error on pull", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ status: "error", message: "Unauthorized", correlationId: "x", category: "AUTH" }),
      });

      await expect(adapter.pullContacts(null)).rejects.toThrow("Unauthorized");
    });
  });

  describe("pullMeetings", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new HubSpotAdapter();
      await expect(unconfigured.pullMeetings(null)).rejects.toThrow("HubSpot not configured");
    });

    it("should fetch meetings without since parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: "10",
                properties: {
                  hs_meeting_title: "Client Call",
                  hs_meeting_body: "Discussion notes",
                  hs_meeting_location: "Office",
                  hs_meeting_start_time: "1705312800000",
                  hs_meeting_end_time: "1705316400000",
                  hs_meeting_outcome: "COMPLETED",
                  hs_timestamp: "1705312800000",
                  hs_lastmodifieddate: "2026-01-15T12:00:00Z",
                },
                createdAt: "2026-01-15T10:00:00Z",
                updatedAt: "2026-01-15T12:00:00Z",
              },
            ],
          }),
      });

      const result = await adapter.pullMeetings(null);

      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0].title).toBe("Client Call");
      expect(result.nextSyncToken).toBe("2026-01-15T12:00:00Z");
    });

    it("should use search API when since is provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await adapter.pullMeetings(testDate);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.hubapi.com/crm/v3/objects/meetings/search",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("testConnection", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new HubSpotAdapter();
      const result = await unconfigured.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("HubSpot not configured");
    });

    it("should return success when API responds OK", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connected to HubSpot");
    });

    it("should return failure on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ status: "error", message: "Invalid token", correlationId: "x", category: "AUTH" }),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid token");
    });

    it("should handle network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Connection refused");
    });
  });
});
