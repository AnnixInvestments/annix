jest.mock("imap-simple", () => ({ connect: jest.fn() }));
jest.mock("mailparser", () => ({ simpleParser: jest.fn() }));

import * as Imap from "imap-simple";
import { simpleParser } from "mailparser";
import { InboundEmailStatus } from "./entities/inbound-email.entity";
import { InboundEmailMonitorService } from "./inbound-email-monitor.service";

const mockConnect = Imap.connect as unknown as jest.Mock;
const mockSimpleParser = simpleParser as unknown as jest.Mock;

interface FakeHeader {
  uid: number;
  messageId?: string;
  from?: string;
  subject?: string;
  date?: string;
}

const headerMessage = (h: FakeHeader) => {
  const body: Record<string, string[]> = {};
  if (h.messageId) body["message-id"] = [h.messageId];
  if (h.from) body.from = [h.from];
  if (h.subject) body.subject = [h.subject];
  if (h.date) body.date = [h.date];
  return { attributes: { uid: h.uid }, parts: [{ which: "HEADER", body }] };
};

const fullMessage = (uid: number) => ({
  attributes: { uid },
  parts: [{ which: "", body: "raw-rfc822" }],
});

describe("InboundEmailMonitorService", () => {
  const buildConnection = (headers: ReturnType<typeof headerMessage>[]) => {
    const search = jest.fn().mockImplementation((criteria: unknown) => {
      const first = Array.isArray(criteria) ? (criteria[0] as unknown[]) : [];
      const isUidFetch = Array.isArray(first) && first[0] === "UID";
      if (isUidFetch) {
        const uid = Number.parseInt(String(first[1]), 10);
        return Promise.resolve([fullMessage(uid)]);
      }
      return Promise.resolve(headers);
    });
    return {
      openBox: jest.fn().mockResolvedValue(undefined),
      search,
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      end: jest.fn(),
    };
  };

  const build = (options: {
    headers: ReturnType<typeof headerMessage>[];
    emailExists: boolean;
    autoDeleteDomains?: string;
    emailUser?: string;
    parsedOverride?: Record<string, unknown>;
    router?: unknown;
  }) => {
    const connection = buildConnection(options.headers);
    mockConnect.mockResolvedValue(connection);
    mockSimpleParser.mockResolvedValue({
      messageId: "<ignored@parsed>",
      from: { value: [{ address: "sender@example.com", name: "Sender" }] },
      subject: "Parsed subject",
      date: null,
      attachments: [],
      ...options.parsedOverride,
    });

    const config = {
      id: 7,
      app: "au-rubber",
      companyId: 3,
      emailUser: options.emailUser ?? "au-rubber-app@example.com",
      emailHost: "imap.example.com",
      emailPort: 993,
      tlsEnabled: true,
      tlsServerName: null,
      emailPassEncrypted: "enc",
    };

    const inboundEmailService = {
      enabledConfigs: jest.fn().mockResolvedValue([config]),
      decryptPassword: jest.fn().mockResolvedValue("pw"),
      updateLastPoll: jest.fn().mockResolvedValue(undefined),
      emailExists: jest.fn().mockResolvedValue(options.emailExists),
      recordEmail: jest.fn().mockResolvedValue({ id: 55 }),
      updateEmailStatus: jest.fn().mockResolvedValue(undefined),
      createAttachment: jest.fn().mockResolvedValue({ id: 88, extractionStatus: "pending" }),
      updateAttachment: jest.fn().mockResolvedValue(undefined),
    };

    const registry = {
      isRegistered: jest.fn().mockReturnValue(true),
      adapterForApp: jest.fn().mockReturnValue({
        resolveCompanyId: jest.fn().mockResolvedValue(3),
      }),
      routerForApp: jest.fn().mockReturnValue(options.router ?? null),
      classifierForApp: jest.fn().mockReturnValue(null),
    };

    const storageService = {
      upload: jest.fn().mockResolvedValue({ path: "stored/path.pdf" }),
    };

    const configValues: Record<string, string | undefined> = {
      EMAIL_DELIVERY_DISABLED: undefined,
      INBOUND_POLL_WINDOW_DAYS: undefined,
      INBOUND_AUTO_DELETE_DOMAINS: options.autoDeleteDomains ?? "",
    };
    const configService = {
      get: jest.fn().mockImplementation((key: string) => configValues[key]),
    };

    const service = new InboundEmailMonitorService(
      inboundEmailService as never,
      registry as never,
      storageService as never,
      configService as never,
    );

    return { service, connection, inboundEmailService };
  };

  const pdfAttachment = {
    filename: "IMP-QMS-CERT-05 - Batch Certificate.pdf",
    content: Buffer.from("%PDF-1.4 fake"),
    contentType: "application/pdf",
    size: 12,
  };

  // A router that classifies by subject and always returns a "no linked record"
  // routing result — models the real-world case where the CoC pipeline runs but
  // can't identify the supplier (or the document is an unreadable image).
  const noOpRouter = {
    supportedMimeTypes: () => ["application/pdf"],
    classifyFromSubject: () => ({ documentType: "coc", confidence: 0.5, source: "subject" }),
    route: jest.fn().mockResolvedValue({
      linkedEntityType: null,
      linkedEntityId: null,
      extractionTriggered: false,
    }),
  };

  beforeEach(() => {
    mockConnect.mockReset();
    mockSimpleParser.mockReset();
  });

  it("skips an already-recorded email by Message-ID without fetching its body or deleting it", async () => {
    const { service, connection, inboundEmailService } = build({
      headers: [headerMessage({ uid: 101, messageId: "<real-1@example.com>" })],
      emailExists: true,
      autoDeleteDomains: "example.com",
    });

    const result = await service.pollAllConfigs();

    expect(inboundEmailService.emailExists).toHaveBeenCalledWith("<real-1@example.com>");
    expect(connection.search).toHaveBeenCalledTimes(1);
    expect(inboundEmailService.recordEmail).not.toHaveBeenCalled();
    expect(connection.deleteMessage).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });

  it("ingests a new email and auto-deletes it on an owned mailbox once COMPLETED", async () => {
    const { service, connection, inboundEmailService } = build({
      headers: [headerMessage({ uid: 202, messageId: "<real-2@example.com>" })],
      emailExists: false,
      autoDeleteDomains: "example.com",
      emailUser: "au-rubber-app@example.com",
    });

    const result = await service.pollAllConfigs();

    expect(connection.search).toHaveBeenCalledTimes(2);
    expect(inboundEmailService.recordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "<real-2@example.com>" }),
    );
    expect(inboundEmailService.updateEmailStatus).toHaveBeenCalledWith(
      55,
      InboundEmailStatus.COMPLETED,
    );
    expect(connection.deleteMessage).toHaveBeenCalledWith(202);
    expect(result.processed).toBe(1);
  });

  it("does not auto-delete a processed email when its domain is not owned", async () => {
    const { service, connection } = build({
      headers: [headerMessage({ uid: 303, messageId: "<real-3@example.com>" })],
      emailExists: false,
      autoDeleteDomains: "",
      emailUser: "au-rubber-app@gmail.com",
    });

    await service.pollAllConfigs();

    expect(connection.deleteMessage).not.toHaveBeenCalled();
  });

  it("dedups a headerless email by a deterministic synthetic id, not a random one", async () => {
    const { service, inboundEmailService } = build({
      headers: [
        headerMessage({
          uid: 404,
          from: "Supplier <supplier@example.com>",
          subject: "Delivery note",
          date: "Wed, 25 Jun 2026 09:00:00 +0200",
        }),
      ],
      emailExists: true,
    });

    await service.pollAllConfigs();

    const dedupId = inboundEmailService.emailExists.mock.calls[0][0] as string;
    expect(dedupId).toMatch(/^synthetic:[a-f0-9]{64}$/);
  });

  it("marks an email NEEDS_REVIEW and keeps it in the mailbox when routing produces no record", async () => {
    const { service, connection, inboundEmailService } = build({
      headers: [headerMessage({ uid: 505, messageId: "<real-5@example.com>" })],
      emailExists: false,
      autoDeleteDomains: "example.com",
      emailUser: "au-rubber-app@example.com",
      parsedOverride: { attachments: [pdfAttachment] },
      router: noOpRouter,
    });

    await service.pollAllConfigs();

    expect(noOpRouter.route).toHaveBeenCalled();
    expect(inboundEmailService.updateEmailStatus).toHaveBeenCalledWith(
      55,
      InboundEmailStatus.NEEDS_REVIEW,
    );
    // A no-record email must NOT be auto-deleted — it has to stay visible for triage.
    expect(connection.deleteMessage).not.toHaveBeenCalled();
  });

  it("records an email with an empty sender instead of dropping it when From is unparseable", async () => {
    const { service, inboundEmailService } = build({
      headers: [headerMessage({ uid: 606, messageId: "<real-6@example.com>" })],
      emailExists: false,
      parsedOverride: { from: undefined, attachments: [] },
    });

    await service.pollAllConfigs();

    expect(inboundEmailService.recordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "<real-6@example.com>", fromEmail: "" }),
    );
  });

  it("falls back to the raw From text when the sender address cannot be structured", async () => {
    const { service, inboundEmailService } = build({
      headers: [headerMessage({ uid: 707, messageId: "<real-7@example.com>" })],
      emailExists: false,
      parsedOverride: { from: { text: "Enock Impilo <enock@impilogroup.co.za>" }, attachments: [] },
    });

    await service.pollAllConfigs();

    expect(inboundEmailService.recordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ fromEmail: "enock@impilogroup.co.za" }),
    );
  });
});
