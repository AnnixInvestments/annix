import { fromISO } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import { SalesforceAdapter } from "./salesforce.adapter";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("SalesforceAdapter", () => {
  let adapter: SalesforceAdapter;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockProspect: Partial<Prospect> = {
    id: 1,
    companyName: "Acme Corp",
    contactName: "John Smith",
    contactEmail: "john@example.com",
    contactPhone: "+27821234567",
    contactTitle: "Purchasing Manager",
    streetAddress: "123 Main St",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2000",
    country: "South Africa",
    notes: "Important client",
    status: "new" as any,
    score: 60,
    crmExternalId: null,
    estimatedValue: 100000,
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    title: "Product Demo",
    description: "Demo of new product line",
    notes: "Prepare samples",
    outcomes: "Client interested",
    actionItems: [{ task: "Send quote", assignee: "Sales Rep", dueDate: null }],
    scheduledStart: testDate,
    scheduledEnd: fromISO("2026-01-15T11:00:00Z").toJSDate(),
    location: "Client office",
    crmExternalId: null,
    status: "scheduled" as any,
    meetingType: "in_person" as any,
  };

  beforeEach(() => {
    adapter = new SalesforceAdapter();
    adapter.configureOAuth(
      {
        accessToken: "sf-token",
        refreshToken: null,
        instanceUrl: "https://myorg.salesforce.com",
      },
      {
        type: "salesforce",
        name: "Test Salesforce",
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
    expect(adapter.type).toBe("salesforce");
  });

  it("should return configured name", () => {
    expect(adapter.name).toBe("Test Salesforce");
  });

  it("should return default name when not configured", () => {
    const unconfigured = new SalesforceAdapter();
    expect(unconfigured.name).toBe("Salesforce CRM");
  });

  describe("syncContact", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new SalesforceAdapter();
      const result = await unconfigured.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should create a new lead via POST", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "sf-lead-123", success: true }),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("sf-lead-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.salesforce.com/services/data/v58.0/sobjects/Lead",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update an existing lead via PATCH", async () => {
      const existingProspect = { ...mockProspect, crmExternalId: "sf-lead-123" };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const result = await adapter.syncContact(existingProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("sf-lead-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.salesforce.com/services/data/v58.0/sobjects/Lead/sf-lead-123",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should handle API error on create", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve([
            { message: "Required field missing", errorCode: "REQUIRED_FIELD_MISSING" },
          ]),
      });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Required field missing");
    });

    it("should handle API error on update", async () => {
      const existing = { ...mockProspect, crmExternalId: "sf-123" };
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve([{ message: "Entity deleted", errorCode: "ENTITY_IS_DELETED" }]),
      });

      const result = await adapter.syncContact(existing as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Entity deleted");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
    });

    it("should map prospect status to Salesforce status", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "123", success: true }),
      });

      await adapter.syncContact({ ...mockProspect, status: "won" as any } as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.Status).toBe("Closed - Converted");
    });

    it("should map score to rating", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "123", success: true }),
      });

      await adapter.syncContact({ ...mockProspect, score: 85 } as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.Rating).toBe("Hot");
    });
  });

  describe("syncMeeting", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new SalesforceAdapter();
      const result = await unconfigured.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should create a new event via POST", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "sf-event-456", success: true }),
      });

      const result = await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("sf-event-456");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://myorg.salesforce.com/services/data/v58.0/sobjects/Event",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update an existing event via PATCH", async () => {
      const meetingWithCrm = { ...mockMeeting, crmExternalId: "sf-event-456" };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const result = await adapter.syncMeeting(meetingWithCrm as Meeting, mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("sf-event-456");
    });

    it("should handle event create failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Insufficient access" }),
      });

      const result = await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      expect(result.success).toBe(false);
    });
  });

  describe("pullContacts", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new SalesforceAdapter();
      await expect(unconfigured.pullContacts(null)).rejects.toThrow("Salesforce not configured");
    });

    it("should fetch leads without since filter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            totalSize: 1,
            done: true,
            records: [
              {
                Id: "sf-1",
                attributes: { type: "Lead", url: "/Lead/sf-1" },
                FirstName: "Jane",
                LastName: "Doe",
                Company: "Test Corp",
                Email: "jane@example.com",
                Phone: null,
                Title: null,
                Street: null,
                City: "Cape Town",
                State: "WC",
                PostalCode: "8000",
                Country: "South Africa",
                Description: null,
                Status: "Open - Not Contacted",
                Rating: "Warm",
                AnnualRevenue: null,
                LastModifiedDate: "2026-01-15T10:00:00.000+0000",
              },
            ],
          }),
      });

      const result = await adapter.pullContacts(null);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].companyName).toBe("Test Corp");
      expect(result.contacts[0].status).toBe("new");
      expect(result.nextSyncToken).toBe("2026-01-15T10:00:00.000+0000");
    });

    it("should include WHERE clause when since is provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ totalSize: 0, done: true, records: [] }),
      });

      await adapter.pullContacts(testDate);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("WHERE");
      expect(url).toContain("LastModifiedDate");
    });

    it("should handle API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve([{ message: "Session expired", errorCode: "INVALID_SESSION_ID" }]),
      });

      await expect(adapter.pullContacts(null)).rejects.toThrow("Session expired");
    });
  });

  describe("pullMeetings", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new SalesforceAdapter();
      await expect(unconfigured.pullMeetings(null)).rejects.toThrow("Salesforce not configured");
    });

    it("should fetch events", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            totalSize: 1,
            done: true,
            records: [
              {
                Id: "ev-1",
                attributes: { type: "Event", url: "/Event/ev-1" },
                Subject: "Client Meeting",
                Description: "Quarterly review",
                StartDateTime: "2026-01-15T10:00:00.000+0000",
                EndDateTime: "2026-01-15T11:00:00.000+0000",
                Location: "HQ",
                WhoId: "contact-1",
                WhatId: null,
                ActivityDate: null,
                LastModifiedDate: "2026-01-15T12:00:00.000+0000",
              },
            ],
          }),
      });

      const result = await adapter.pullMeetings(null);

      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0].title).toBe("Client Meeting");
      expect(result.meetings[0].contactExternalId).toBe("contact-1");
    });
  });

  describe("testConnection", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new SalesforceAdapter();
      const result = await unconfigured.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Salesforce not configured");
    });

    it("should return success when API responds OK", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connected to Salesforce");
    });

    it("should return failure on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Invalid session" }),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("DNS resolution failed"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("DNS resolution failed");
    });
  });
});
