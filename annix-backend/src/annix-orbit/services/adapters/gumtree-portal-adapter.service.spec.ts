import { GumtreePortalAdapter } from "./gumtree-portal-adapter.service";

describe("GumtreePortalAdapter", () => {
  const registry = { register: jest.fn() };
  const emailService = { sendEmail: jest.fn() };

  const configWith = (value: string | undefined) => ({
    get: jest.fn().mockReturnValue(value),
  });

  const job = {
    id: 123,
    referenceNumber: "JOB-ABC123",
    title: "Senior Engineer",
    location: "Cape Town",
    description: "A real role",
    requiredSkills: [],
  } as never;

  beforeEach(() => jest.clearAllMocks());

  const build = (email: string | undefined) => {
    const adapter = new GumtreePortalAdapter(
      registry as never,
      emailService as never,
      configWith(email) as never,
    );
    adapter.onModuleInit();
    return adapter;
  };

  it("refuses to send and never emails when the listings inbox is a placeholder", async () => {
    emailService.sendEmail.mockResolvedValue(true);
    const adapter = build("listings@example.com");

    const result = await adapter.post(job);

    expect(result.success).toBe(false);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses to send when the listings inbox is unset", async () => {
    const adapter = build(undefined);

    const result = await adapter.post(job);

    expect(result.success).toBe(false);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("submits for manual posting with no fabricated external id when configured", async () => {
    emailService.sendEmail.mockResolvedValue(true);
    const adapter = build("real-listings@annix.co.za");

    const result = await adapter.post(job);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "real-listings@annix.co.za" }),
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("submitted");
    expect(result.requiresManualConfirmation).toBe(true);
    expect(result.portalJobId).toBeUndefined();
  });
});
