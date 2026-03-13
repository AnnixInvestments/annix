import { fromISO } from "../../lib/datetime";
import type { Meeting, Prospect } from "../entities";
import { PipedriveAdapter } from "./pipedrive.adapter";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("PipedriveAdapter", () => {
  let adapter: PipedriveAdapter;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockProspect: Partial<Prospect> = {
    id: 1,
    companyName: "Acme Corp",
    contactName: "John Smith",
    contactEmail: "john@acme.com",
    contactPhone: "+27821234567",
    contactTitle: "Buyer",
    streetAddress: "456 Industrial Rd",
    city: "Pretoria",
    province: "Gauteng",
    postalCode: "0001",
    country: "South Africa",
    notes: null,
    status: "contacted" as any,
    score: 40,
    crmExternalId: null,
    estimatedValue: 25000,
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    title: "Follow-up Call",
    description: "Review pending order",
    notes: "Discuss delivery timeline",
    outcomes: null,
    actionItems: [],
    scheduledStart: testDate,
    scheduledEnd: fromISO("2026-01-15T10:30:00Z").toJSDate(),
    location: "Phone",
    crmExternalId: null,
    status: "completed" as any,
    meetingType: "phone" as any,
  };

  beforeEach(() => {
    adapter = new PipedriveAdapter();
    adapter.configureOAuth(
      {
        accessToken: "pd-token",
        refreshToken: null,
        instanceUrl: "https://mycompany.pipedrive.com",
      },
      {
        type: "pipedrive",
        name: "Test Pipedrive",
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
    expect(adapter.type).toBe("pipedrive");
  });

  it("should return configured name", () => {
    expect(adapter.name).toBe("Test Pipedrive");
  });

  it("should return default name when not configured", () => {
    const unconfigured = new PipedriveAdapter();
    expect(unconfigured.name).toBe("Pipedrive CRM");
  });

  describe("syncContact", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new PipedriveAdapter();
      const result = await unconfigured.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should find or create organization before creating person", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, data: { items: [{ item: { id: 10 } }] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, data: { id: 42, name: "John Smith" } }),
        });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("42");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should create new organization when not found", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 20 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 50, name: "John Smith" } }),
        });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("50");
    });

    it("should update an existing person via PUT", async () => {
      const existingProspect = { ...mockProspect, crmExternalId: "42", companyName: null as any };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 42 } }),
      });

      const result = await adapter.syncContact(existingProspect as Prospect);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("42");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/persons/42"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should handle API error on create", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 20 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: false, error: "Validation failed" }),
        });

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Validation failed");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Timeout"));

      const result = await adapter.syncContact(mockProspect as Prospect);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeout");
    });
  });

  describe("syncMeeting", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new PipedriveAdapter();
      const result = await unconfigured.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should create a new activity", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 99 } }),
      });

      const result = await adapter.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("99");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/activities"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should map phone meeting type to call", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 99 } }),
      });

      await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe("call");
    });

    it("should mark completed meetings as done", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 99 } }),
      });

      await adapter.syncMeeting(mockMeeting as Meeting, mockProspect as Prospect);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.done).toBe(true);
    });

    it("should update an existing activity via PUT", async () => {
      const meetingWithCrm = { ...mockMeeting, crmExternalId: "99" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 99 } }),
      });

      const result = await adapter.syncMeeting(
        meetingWithCrm as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("99");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/activities/99"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should handle activity create failure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: "Permission denied" }),
      });

      const result = await adapter.syncMeeting(
        mockMeeting as Meeting,
        mockProspect as Prospect,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });
  });

  describe("pullContacts", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new PipedriveAdapter();
      await expect(unconfigured.pullContacts(null)).rejects.toThrow("Pipedrive not configured");
    });

    it("should fetch persons", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 1,
                name: "Jane Doe",
                email: [{ value: "jane@example.com", primary: true }],
                phone: [{ value: "+27111111111", primary: true }],
                org_id: null,
                org_name: "Test Org",
                update_time: "2026-01-15 10:00:00",
              },
            ],
          }),
      });

      const result = await adapter.pullContacts(null);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].contactName).toBe("Jane Doe");
      expect(result.contacts[0].email).toBe("jane@example.com");
      expect(result.nextSyncToken).toBe("2026-01-15 10:00:00");
    });

    it("should handle null data response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });

      const result = await adapter.pullContacts(null);

      expect(result.contacts).toEqual([]);
      expect(result.nextSyncToken).toBeNull();
    });

    it("should handle API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: "Unauthorized" }),
      });

      await expect(adapter.pullContacts(null)).rejects.toThrow("Unauthorized");
    });
  });

  describe("pullMeetings", () => {
    it("should throw when not configured", async () => {
      const unconfigured = new PipedriveAdapter();
      await expect(unconfigured.pullMeetings(null)).rejects.toThrow("Pipedrive not configured");
    });

    it("should fetch and filter meeting-type activities", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 1,
                subject: "Client Meeting",
                type: "meeting",
                due_date: "2026-01-15",
                due_time: "10:00",
                duration: "01:00",
                note: "Notes here",
                location: "Office",
                person_id: 5,
                org_id: null,
                deal_id: null,
                update_time: "2026-01-15 12:00:00",
                done: false,
              },
              {
                id: 2,
                subject: "Send Email",
                type: "email",
                due_date: "2026-01-15",
                due_time: "14:00",
                duration: "00:15",
                note: "",
                location: "",
                person_id: null,
                org_id: null,
                deal_id: null,
                update_time: "2026-01-15 14:00:00",
                done: true,
              },
              {
                id: 3,
                subject: "Sales Call",
                type: "call",
                due_date: "2026-01-15",
                due_time: "15:00",
                duration: "00:30",
                note: "Follow up",
                location: "",
                person_id: 10,
                org_id: null,
                deal_id: null,
                update_time: "2026-01-15 16:00:00",
                done: true,
              },
            ],
          }),
      });

      const result = await adapter.pullMeetings(null);

      expect(result.meetings).toHaveLength(2);
      expect(result.meetings[0].title).toBe("Client Meeting");
      expect(result.meetings[1].title).toBe("Sales Call");
      expect(result.nextSyncToken).toBe("2026-01-15 16:00:00");
    });
  });

  describe("testConnection", () => {
    it("should return failure when not configured", async () => {
      const unconfigured = new PipedriveAdapter();
      const result = await unconfigured.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Pipedrive not configured");
    });

    it("should return success when users/me responds successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connected to Pipedrive");
    });

    it("should return failure on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: "Invalid API token" }),
      });

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid API token");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Socket hang up"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Socket hang up");
    });
  });
});
