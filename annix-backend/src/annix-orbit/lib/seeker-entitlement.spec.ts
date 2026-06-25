import {
  highestTier,
  isOrbitBillingStatus,
  type OrbitBillingStatus,
  resolveEntitledTier,
  type SeekerEntitlementInputs,
} from "./seeker-entitlement";

const NOW = 1_700_000_000_000;

function inputs(overrides: Partial<SeekerEntitlementInputs> = {}): SeekerEntitlementInputs {
  return {
    requestedTier: "soft",
    trialTier: null,
    trialEndsAt: null,
    entitledTier: "soft",
    billingStatus: "none",
    paidUntil: null,
    enforced: false,
    nowMillis: NOW,
    ...overrides,
  };
}

describe("resolveEntitledTier", () => {
  describe("flag OFF (pilot free-for-all)", () => {
    it("resolves a self-selected hard tier to hard", () => {
      const tier = resolveEntitledTier(inputs({ requestedTier: "hard", enforced: false }));
      expect(tier).toBe("hard");
    });

    it("falls back to soft when no requested tier is present", () => {
      const tier = resolveEntitledTier(inputs({ requestedTier: null, enforced: false }));
      expect(tier).toBe("soft");
    });
  });

  describe("flag ON (billing enforced)", () => {
    it("downgrades a self-selected hard tier to soft when billing is none", () => {
      const tier = resolveEntitledTier(
        inputs({
          requestedTier: "hard",
          entitledTier: "hard",
          billingStatus: "none",
          enforced: true,
        }),
      );
      expect(tier).toBe("soft");
    });

    it("resolves to entitledTier when billing is active", () => {
      const tier = resolveEntitledTier(
        inputs({
          requestedTier: "hard",
          entitledTier: "hard",
          billingStatus: "active",
          enforced: true,
        }),
      );
      expect(tier).toBe("hard");
    });

    it("resolves to entitledTier when paidUntil is in the future even if status lags", () => {
      const tier = resolveEntitledTier(
        inputs({
          entitledTier: "medium",
          billingStatus: "past_due",
          paidUntil: new Date(NOW + 86_400_000),
          enforced: true,
        }),
      );
      expect(tier).toBe("medium");
    });

    it("downgrades to soft when paidUntil has expired and status is not active", () => {
      const tier = resolveEntitledTier(
        inputs({
          entitledTier: "hard",
          billingStatus: "past_due",
          paidUntil: new Date(NOW - 1),
          enforced: true,
        }),
      );
      expect(tier).toBe("soft");
    });
  });

  describe("active trial overrides regardless of the flag", () => {
    it("returns trialTier with the flag OFF", () => {
      const tier = resolveEntitledTier(
        inputs({
          requestedTier: "soft",
          trialTier: "hard",
          trialEndsAt: new Date(NOW + 86_400_000),
          enforced: false,
        }),
      );
      expect(tier).toBe("hard");
    });

    it("returns trialTier with the flag ON and no active billing", () => {
      const tier = resolveEntitledTier(
        inputs({
          requestedTier: "hard",
          trialTier: "medium",
          trialEndsAt: new Date(NOW + 86_400_000),
          entitledTier: "soft",
          billingStatus: "none",
          enforced: true,
        }),
      );
      expect(tier).toBe("medium");
    });

    it("ignores an expired trial and falls through to billing rules", () => {
      const tier = resolveEntitledTier(
        inputs({
          requestedTier: "hard",
          trialTier: "hard",
          trialEndsAt: new Date(NOW - 1),
          entitledTier: "hard",
          billingStatus: "none",
          enforced: true,
        }),
      );
      expect(tier).toBe("soft");
    });
  });
});

describe("isOrbitBillingStatus", () => {
  it("accepts the four known statuses", () => {
    const statuses: OrbitBillingStatus[] = ["none", "trialing", "active", "past_due"];
    statuses.forEach((status) => expect(isOrbitBillingStatus(status)).toBe(true));
  });

  it("rejects unknown values and null", () => {
    expect(isOrbitBillingStatus("paid")).toBe(false);
    expect(isOrbitBillingStatus(null)).toBe(false);
    expect(isOrbitBillingStatus(undefined)).toBe(false);
  });
});

describe("resolveEntitledTier fail-closed (flag ON, garbage entitledTier)", () => {
  it("degrades an unknown entitled tier to soft instead of granting unlimited", () => {
    const tier = resolveEntitledTier(
      inputs({
        enforced: true,
        billingStatus: "active",
        entitledTier: "premium",
      }),
    );
    expect(tier).toBe("soft");
  });

  it("honours a valid entitled tier when billing is active", () => {
    const tier = resolveEntitledTier(
      inputs({ enforced: true, billingStatus: "active", entitledTier: "hard" }),
    );
    expect(tier).toBe("hard");
  });
});

describe("highestTier", () => {
  it("returns the highest-ranked tier across candidates", () => {
    expect(highestTier(["soft", "hard", "medium"])).toBe("hard");
    expect(highestTier(["soft", "medium"])).toBe("medium");
  });

  it("ignores unknown and null tiers", () => {
    expect(highestTier(["soft", "premium", null, "medium"])).toBe("medium");
  });

  it("falls back to soft for an empty or all-unknown list", () => {
    expect(highestTier([])).toBe("soft");
    expect(highestTier(["premium", null, undefined])).toBe("soft");
  });
});
