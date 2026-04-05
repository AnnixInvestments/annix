import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { SmsChannel } from "./sms.channel";

describe("SmsChannel", () => {
  const buildChannel = async (overrides: Record<string, string | null> = {}) => {
    const defaults: Record<string, string | null> = {
      TWILIO_ACCOUNT_SID: "ACxxx",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_PHONE_NUMBER: "+27110000000",
    };
    const values = { ...defaults, ...overrides };
    const config = { get: (key: string) => values[key] ?? null };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsChannel, { provide: ConfigService, useValue: config }],
    }).compile();

    return module.get<SmsChannel>(SmsChannel);
  };

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("reports disabled when credentials missing", async () => {
    const channel = await buildChannel({ TWILIO_ACCOUNT_SID: null });
    expect(channel.isEnabled()).toBe(false);

    const result = await channel.send({ phone: "+27110001234" }, { subject: "s", body: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not configured");
  });

  it("fails fast when recipient has no phone", async () => {
    const channel = await buildChannel();
    const result = await channel.send({ userId: 1 }, { subject: "s", body: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("no phone");
  });

  it("sends via Twilio and returns providerMessageId on success", async () => {
    const channel = await buildChannel();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ sid: "SMxxx" }),
    }) as unknown as typeof fetch;

    const result = await channel.send(
      { phone: "+27110001234" },
      { subject: "s", body: "hello world" },
    );

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe("SMxxx");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.twilio.com"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns failure on non-OK HTTP response", async () => {
    const channel = await buildChannel();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad phone",
    }) as unknown as typeof fetch;

    const result = await channel.send({ phone: "invalid" }, { subject: "s", body: "hi" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });

  it("catches fetch exceptions", async () => {
    const channel = await buildChannel();
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await channel.send({ phone: "+27110001234" }, { subject: "s", body: "hi" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("network down");
  });
});
