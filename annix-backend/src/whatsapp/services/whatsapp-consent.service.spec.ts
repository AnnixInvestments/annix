import type { ConfigService } from "@nestjs/config";
import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import { createConsentToken } from "../consent-token";
import { WhatsAppConsentService } from "./whatsapp-consent.service";

const SECRET = "test-secret";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    email: "seeker@example.com",
    whatsappPhone: "27110000000",
    whatsappOptIn: false,
    whatsappOptInAt: null,
    whatsappVerifiedAt: null,
    whatsappVerifiedPhone: null,
    appScope: "orbit:seeker",
    ...overrides,
  } as User;
}

function makeService(user: User | null, verifiedBindingOwner: User | null = null) {
  const saved: User[] = [];
  const userRepo = {
    findById: jest.fn().mockResolvedValue(user),
    findOneByWhatsAppPhone: jest.fn().mockResolvedValue(user),
    findOneByVerifiedWhatsAppPhone: jest.fn().mockResolvedValue(verifiedBindingOwner),
    save: jest.fn().mockImplementation(async (u: User) => {
      saved.push(u);
      return u;
    }),
  } as unknown as UserRepository;
  const configService = {
    get: jest.fn().mockImplementation((key: string) => (key === "JWT_SECRET" ? SECRET : null)),
  } as unknown as ConfigService;
  const service = new WhatsAppConsentService(userRepo, configService);
  return { service, userRepo, saved };
}

describe("WhatsAppConsentService proven-verification marker (issue #398 finding 3)", () => {
  describe("handleInboundConsentReply (the proven path)", () => {
    it("sets whatsappVerifiedAt when the user replies from their number", async () => {
      const user = makeUser();
      const { service, saved } = makeService(user);

      await service.handleInboundConsentReply("27110000000", "Yes, I consent");

      expect(saved).toHaveLength(1);
      expect(saved[0].whatsappVerifiedAt).toBeInstanceOf(Date);
      expect(saved[0].whatsappVerifiedPhone).toBe("27110000000");
      expect(saved[0].whatsappOptIn).toBe(true);
    });

    it("verifies an already-opted-in but never-proven user", async () => {
      const user = makeUser({
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
        whatsappVerifiedAt: null,
      });
      const { service, saved } = makeService(user);

      await service.handleInboundConsentReply("27110000000", "Yes, I consent");

      expect(saved).toHaveLength(1);
      expect(saved[0].whatsappVerifiedAt).toBeInstanceOf(Date);
    });

    it("does nothing when the body is not a consent reply", async () => {
      const user = makeUser();
      const { service, saved } = makeService(user);

      await service.handleInboundConsentReply("27110000000", "hello there");

      expect(saved).toHaveLength(0);
    });

    it("is idempotent once the user is already verified on the same number", async () => {
      const user = makeUser({
        whatsappOptIn: true,
        whatsappVerifiedAt: new Date(),
        whatsappVerifiedPhone: "27110000000",
      });
      const { service, saved } = makeService(user);

      await service.handleInboundConsentReply("27110000000", "Yes, I consent");

      expect(saved).toHaveLength(0);
    });

    it("refuses to bind a number already verified-bound to another account", async () => {
      const user = makeUser({ id: 7 });
      const otherOwner = makeUser({
        id: 99,
        whatsappVerifiedAt: new Date(),
        whatsappVerifiedPhone: "27110000000",
      });
      const { service, saved } = makeService(user, otherOwner);

      await service.handleInboundConsentReply("27110000000", "Yes, I consent");

      expect(saved).toHaveLength(0);
    });

    it("re-proves the binding when the same account replies from a newly-set number", async () => {
      const user = makeUser({
        whatsappPhone: "27110000000",
        whatsappOptIn: true,
        whatsappVerifiedAt: new Date(),
        whatsappVerifiedPhone: "27110009999",
      });
      const { service, saved } = makeService(user, user);

      await service.handleInboundConsentReply("27110000000", "Yes, I consent");

      expect(saved).toHaveLength(1);
      expect(saved[0].whatsappVerifiedPhone).toBe("27110000000");
    });
  });

  describe("submit (the self-typed consent page — NOT proven)", () => {
    it("opts in but does NOT set whatsappVerifiedAt", async () => {
      const user = makeUser();
      const { service, saved } = makeService(user);
      const token = createConsentToken(user.id, SECRET);

      await service.submit(token, { whatsappPhone: "0110000000", consent: true });

      expect(saved).toHaveLength(1);
      expect(saved[0].whatsappOptIn).toBe(true);
      expect(saved[0].whatsappVerifiedAt).toBeNull();
    });
  });
});
