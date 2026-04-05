import { Test, TestingModule } from "@nestjs/testing";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { WebPushChannel } from "./channels/web-push.channel";
import { WhatsAppChannel } from "./channels/whatsapp.channel";
import { NotificationDispatcherService } from "./notification-dispatcher.service";

describe("NotificationDispatcherService", () => {
  let dispatcher: NotificationDispatcherService;

  const makeMockChannel = (name: string, enabled = true) => ({
    channelName: jest.fn().mockReturnValue(name),
    isEnabled: jest.fn().mockReturnValue(enabled),
    send: jest.fn().mockResolvedValue({
      channel: name,
      success: true,
      recipientRef: "test",
    }),
  });

  const emailMock = makeMockChannel("email");
  const smsMock = makeMockChannel("sms");
  const whatsappMock = makeMockChannel("whatsapp");
  const webPushMock = makeMockChannel("web_push");

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        { provide: EmailChannel, useValue: emailMock },
        { provide: SmsChannel, useValue: smsMock },
        { provide: WhatsAppChannel, useValue: whatsappMock },
        { provide: WebPushChannel, useValue: webPushMock },
      ],
    }).compile();

    dispatcher = module.get<NotificationDispatcherService>(NotificationDispatcherService);
    jest.clearAllMocks();
    emailMock.isEnabled.mockReturnValue(true);
    smsMock.isEnabled.mockReturnValue(true);
    whatsappMock.isEnabled.mockReturnValue(true);
    webPushMock.isEnabled.mockReturnValue(true);
  });

  describe("dispatch", () => {
    it("fans out to requested channels only", async () => {
      const results = await dispatcher.dispatch({
        recipient: { email: "user@example.com" },
        content: { subject: "Hi", body: "Body" },
        channels: ["email", "sms"],
      });

      expect(results).toHaveLength(2);
      expect(emailMock.send).toHaveBeenCalled();
      expect(smsMock.send).toHaveBeenCalled();
      expect(whatsappMock.send).not.toHaveBeenCalled();
      expect(webPushMock.send).not.toHaveBeenCalled();
    });

    it("returns a disabled result without calling send when channel is disabled", async () => {
      smsMock.isEnabled.mockReturnValue(false);

      const results = await dispatcher.dispatch({
        recipient: { phone: "+27110001234" },
        content: { subject: "S", body: "B" },
        channels: ["sms"],
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("disabled");
      expect(smsMock.send).not.toHaveBeenCalled();
    });

    it("captures channel exceptions as failed results", async () => {
      emailMock.send.mockRejectedValueOnce(new Error("smtp exploded"));

      const results = await dispatcher.dispatch({
        recipient: { email: "user@example.com" },
        content: { subject: "S", body: "B" },
        channels: ["email"],
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("smtp exploded");
    });

    it("dispatchMany processes multiple requests", async () => {
      const results = await dispatcher.dispatchMany([
        {
          recipient: { email: "a@example.com" },
          content: { subject: "S", body: "B" },
          channels: ["email"],
        },
        {
          recipient: { email: "b@example.com" },
          content: { subject: "S", body: "B" },
          channels: ["email"],
        },
      ]);

      expect(results).toHaveLength(2);
      expect(emailMock.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("channel lookup", () => {
    it("returns registered channel by key", () => {
      expect(dispatcher.channel("email")).toBe(emailMock);
      expect(dispatcher.channel("web_push")).toBe(webPushMock);
    });
  });
});
