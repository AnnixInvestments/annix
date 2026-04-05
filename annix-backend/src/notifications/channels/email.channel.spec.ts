import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../../email/email.service";
import { EmailChannel } from "./email.channel";

describe("EmailChannel", () => {
  let channel: EmailChannel;

  const emailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailChannel, { provide: EmailService, useValue: emailService }],
    }).compile();

    channel = module.get<EmailChannel>(EmailChannel);
    jest.clearAllMocks();
  });

  it("returns correct channel name and enabled state", () => {
    expect(channel.channelName()).toBe("email");
    expect(channel.isEnabled()).toBe(true);
  });

  it("returns failure when recipient has no email", async () => {
    const result = await channel.send({ userId: 42 }, { subject: "S", body: "B" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("no email");
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("forwards to EmailService and maps success", async () => {
    emailService.sendEmail.mockResolvedValue(true);

    const result = await channel.send(
      { email: "user@example.com" },
      { subject: "Hello", body: "World", html: "<p>World</p>" },
    );

    expect(result.success).toBe(true);
    expect(result.recipientRef).toBe("user@example.com");
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>World</p>",
        text: "World",
      }),
    );
  });

  it("wraps exceptions as dispatch failures", async () => {
    emailService.sendEmail.mockRejectedValue(new Error("smtp down"));

    const result = await channel.send({ email: "user@example.com" }, { subject: "S", body: "B" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("smtp down");
  });

  it("reports failure when EmailService returns false", async () => {
    emailService.sendEmail.mockResolvedValue(false);

    const result = await channel.send({ email: "user@example.com" }, { subject: "S", body: "B" });

    expect(result.success).toBe(false);
  });
});
