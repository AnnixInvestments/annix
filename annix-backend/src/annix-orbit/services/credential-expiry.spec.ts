import { addDaysIso, classifyCredentialExpiry, isExpiringOrExpired } from "./credential-expiry";

describe("credential-expiry (issue #362 phase 3)", () => {
  const today = "2026-06-14";

  describe("addDaysIso", () => {
    it("adds days across month boundaries", () => {
      expect(addDaysIso("2026-06-14", 30)).toBe("2026-07-14");
      expect(addDaysIso("2026-12-25", 10)).toBe("2027-01-04");
      expect(addDaysIso("2026-06-14", 0)).toBe("2026-06-14");
    });
  });

  describe("classifyCredentialExpiry", () => {
    it("returns none when there is no expiry date", () => {
      expect(classifyCredentialExpiry(null, today)).toBe("none");
      expect(classifyCredentialExpiry(undefined, today)).toBe("none");
    });

    it("returns expired for a past date", () => {
      expect(classifyCredentialExpiry("2026-06-13", today)).toBe("expired");
      expect(classifyCredentialExpiry("2025-01-01", today)).toBe("expired");
    });

    it("returns expiring within the warning window (inclusive)", () => {
      expect(classifyCredentialExpiry("2026-06-14", today)).toBe("expiring");
      expect(classifyCredentialExpiry("2026-06-28", today)).toBe("expiring");
      expect(classifyCredentialExpiry("2026-07-14", today)).toBe("expiring");
    });

    it("returns valid beyond the warning window", () => {
      expect(classifyCredentialExpiry("2026-07-15", today)).toBe("valid");
      expect(classifyCredentialExpiry("2027-01-01", today)).toBe("valid");
    });

    it("honours a custom warning window", () => {
      expect(classifyCredentialExpiry("2026-06-28", today, 7)).toBe("valid");
      expect(classifyCredentialExpiry("2026-06-20", today, 7)).toBe("expiring");
    });

    it("tolerates full ISO datetime strings", () => {
      expect(classifyCredentialExpiry("2026-06-13T23:59:59.000Z", today)).toBe("expired");
    });

    it("tolerates Date objects (Mongo persists expiry as Date)", () => {
      expect(classifyCredentialExpiry(new Date("2026-06-13T00:00:00.000Z"), today)).toBe("expired");
      expect(classifyCredentialExpiry(new Date("2027-01-01T00:00:00.000Z"), today)).toBe("valid");
    });
  });

  describe("isExpiringOrExpired", () => {
    it("flags expired and expiring, not valid or none", () => {
      expect(isExpiringOrExpired("2026-06-13", today)).toBe(true);
      expect(isExpiringOrExpired("2026-07-01", today)).toBe(true);
      expect(isExpiringOrExpired("2027-01-01", today)).toBe(false);
      expect(isExpiringOrExpired(null, today)).toBe(false);
    });
  });
});
