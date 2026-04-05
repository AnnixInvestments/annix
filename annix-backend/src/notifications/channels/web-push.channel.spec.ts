import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as webpush from "web-push";
import { WebPushChannel } from "./web-push.channel";

jest.mock("web-push");

describe("WebPushChannel", () => {
  const buildChannel = async (configured = true) => {
    const values: Record<string, string | undefined> = configured
      ? {
          VAPID_PUBLIC_KEY: "pub",
          VAPID_PRIVATE_KEY: "priv",
          VAPID_SUBJECT: "mailto:admin@example.com",
        }
      : {};
    const config = {
      get: (key: string, fallback?: string) => values[key] ?? fallback ?? undefined,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebPushChannel, { provide: ConfigService, useValue: config }],
    }).compile();

    return module.get<WebPushChannel>(WebPushChannel);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is disabled when VAPID keys missing", async () => {
    const channel = await buildChannel(false);
    expect(channel.isEnabled()).toBe(false);

    const result = await channel.send(
      { userId: 1, pushSubscriptions: [] },
      { subject: "s", body: "b" },
    );
    expect(result.success).toBe(false);
  });

  it("fails when recipient has no subscriptions", async () => {
    const channel = await buildChannel(true);
    const result = await channel.send(
      { userId: 1, pushSubscriptions: [] },
      { subject: "s", body: "b" },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("No push subscriptions");
  });

  it("sends to all subscriptions and reports success", async () => {
    const channel = await buildChannel(true);
    (webpush.sendNotification as jest.Mock).mockResolvedValue({ statusCode: 201 });

    const result = await channel.send(
      {
        userId: 1,
        pushSubscriptions: [
          { endpoint: "https://push.example.com/1", keys: { p256dh: "p", auth: "a" } },
          { endpoint: "https://push.example.com/2", keys: { p256dh: "p", auth: "a" } },
        ],
      },
      { subject: "Title", body: "Body", actionUrl: "/go" },
    );

    expect(result.success).toBe(true);
    expect(result.staleEndpoints).toEqual([]);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  it("collects stale endpoints for 410/404 responses", async () => {
    const channel = await buildChannel(true);
    (webpush.sendNotification as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 410, message: "Gone" })
      .mockResolvedValueOnce({ statusCode: 201 });

    const result = await channel.send(
      {
        userId: 1,
        pushSubscriptions: [
          { endpoint: "https://stale.example.com", keys: { p256dh: "p", auth: "a" } },
          { endpoint: "https://live.example.com", keys: { p256dh: "p", auth: "a" } },
        ],
      },
      { subject: "s", body: "b" },
    );

    expect(result.success).toBe(true);
    expect(result.staleEndpoints).toEqual(["https://stale.example.com"]);
  });

  it("marks non-stale errors as failures without losing the result", async () => {
    const channel = await buildChannel(true);
    (webpush.sendNotification as jest.Mock).mockRejectedValue({
      statusCode: 500,
      message: "server error",
    });

    const result = await channel.send(
      {
        userId: 1,
        pushSubscriptions: [
          { endpoint: "https://a.example.com", keys: { p256dh: "p", auth: "a" } },
        ],
      },
      { subject: "s", body: "b" },
    );

    expect(result.success).toBe(false);
    expect(result.staleEndpoints).toEqual([]);
  });
});
