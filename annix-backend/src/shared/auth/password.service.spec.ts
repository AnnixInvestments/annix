import { Test, TestingModule } from "@nestjs/testing";
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("hash", () => {
    it("should return a hash and salt", async () => {
      const password = "TestPassword123!";

      const result = await service.hash(password);

      expect(result).toHaveProperty("hash");
      expect(result).toHaveProperty("salt");
      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
    });

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123!";

      const result1 = await service.hash(password);
      const result2 = await service.hash(password);

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it("should generate different hashes for different passwords", async () => {
      const result1 = await service.hash("Password1");
      const result2 = await service.hash("Password2");

      expect(result1.hash).not.toBe(result2.hash);
    });

    it("should handle empty password", async () => {
      const result = await service.hash("");

      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
    });

    it("should handle special characters in password", async () => {
      const password = 'P@$$w0rd!#$%^&*()_+{}[]|\\:";<>?,./~`';

      const result = await service.hash(password);

      expect(result.hash).toBeTruthy();
    });

    it("should handle unicode characters in password", async () => {
      const password = "пароль密码パスワード";

      const result = await service.hash(password);

      expect(result.hash).toBeTruthy();
    });

    it("should handle very long password", async () => {
      const password = "a".repeat(1000);

      const result = await service.hash(password);

      expect(result.hash).toBeTruthy();
    });
  });

  describe("verify", () => {
    it("should return true for matching password", async () => {
      const password = "TestPassword123!";
      const { hash } = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it("should return false for non-matching password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword456!";
      const { hash } = await service.hash(password);

      const result = await service.verify(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it("should return false for similar but different password", async () => {
      const password = "TestPassword123!";
      const similarPassword = "TestPassword123";
      const { hash } = await service.hash(password);

      const result = await service.verify(similarPassword, hash);

      expect(result).toBe(false);
    });

    it("should be case sensitive", async () => {
      const password = "TestPassword";
      const { hash } = await service.hash(password);

      const resultLower = await service.verify("testpassword", hash);
      const resultUpper = await service.verify("TESTPASSWORD", hash);

      expect(resultLower).toBe(false);
      expect(resultUpper).toBe(false);
    });

    it("should handle empty password verification", async () => {
      const { hash } = await service.hash("");

      const result = await service.verify("", hash);

      expect(result).toBe(true);
    });

    it("should return false when verifying empty against non-empty hash", async () => {
      const { hash } = await service.hash("SomePassword");

      const result = await service.verify("", hash);

      expect(result).toBe(false);
    });

    it("should handle special characters correctly", async () => {
      const password = "P@$$w0rd!#$%^&*()";
      const { hash } = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it("should handle unicode characters correctly", async () => {
      const password = "пароль密码パスワード";
      const { hash } = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it("should handle whitespace differences", async () => {
      const password = "Test Password";
      const { hash } = await service.hash(password);

      const resultNoSpace = await service.verify("TestPassword", hash);
      const resultExtraSpace = await service.verify("Test  Password", hash);

      expect(resultNoSpace).toBe(false);
      expect(resultExtraSpace).toBe(false);
    });
  });

  describe("hash and verify integration", () => {
    it("should consistently hash and verify multiple passwords", async () => {
      const passwords = [
        "SimplePassword",
        "Complex!P@ssw0rd#123",
        "12345678",
        "   spaces   ",
        "emoji🔐password",
      ];

      for (const password of passwords) {
        const { hash } = await service.hash(password);
        const verified = await service.verify(password, hash);
        expect(verified).toBe(true);
      }
    }, 30000);

    it("should work across multiple hash/verify cycles", async () => {
      const password = "TestPassword";

      for (let i = 0; i < 5; i++) {
        const { hash } = await service.hash(password);
        const verified = await service.verify(password, hash);
        expect(verified).toBe(true);
      }
    }, 30000);
  });
});
