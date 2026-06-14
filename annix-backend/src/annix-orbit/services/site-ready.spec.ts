import { computeSiteReady, type ScoreableCredential } from "./site-ready";

const today = "2026-06-14";

const cred = (overrides: Partial<ScoreableCredential>): ScoreableCredential => ({
  credentialType: "medical",
  expiresAt: "2027-01-01",
  verified: true,
  ...overrides,
});

describe("site-ready score (issue #362 phase 4)", () => {
  it("returns no_passport at score 0 when there are no credentials", () => {
    const result = computeSiteReady([], today);
    expect(result.status).toBe("no_passport");
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
  });

  it("scores a fully valid, verified passport as ready (100)", () => {
    const result = computeSiteReady(
      [
        cred({ credentialType: "medical" }),
        cred({ credentialType: "mine_induction" }),
        cred({ credentialType: "working_at_heights" }),
      ],
      today,
    );
    expect(result.score).toBe(100);
    expect(result.status).toBe("ready");
    expect(result.validCount).toBe(3);
    expect(result.gaps).toHaveLength(0);
  });

  it("discounts unverified valid credentials", () => {
    const result = computeSiteReady([cred({ verified: false })], today);
    expect(result.score).toBe(70);
    expect(result.status).toBe("nearly");
  });

  it("treats expired credentials as disqualifying and lists them as gaps", () => {
    const result = computeSiteReady(
      [
        cred({ credentialType: "medical", expiresAt: "2027-01-01" }),
        cred({ credentialType: "working_at_heights", expiresAt: "2026-06-13" }),
      ],
      today,
    );
    expect(result.expiredCount).toBe(1);
    expect(result.score).toBe(50); // (1 + 0) / 2
    expect(result.gaps).toEqual([
      { credentialType: "working_at_heights", status: "expired", expiresAt: "2026-06-13" },
    ]);
  });

  it("flags expiring-soon credentials as gaps without zeroing them", () => {
    const result = computeSiteReady(
      [cred({ credentialType: "medical", expiresAt: "2026-06-20" })],
      today,
    );
    expect(result.expiringCount).toBe(1);
    expect(result.gaps[0].status).toBe("expiring");
    expect(result.score).toBe(40);
    expect(result.status).toBe("not_ready");
  });

  it("counts undated credentials as usable but slightly discounted", () => {
    const verified = computeSiteReady([cred({ expiresAt: null, verified: true })], today);
    expect(verified.score).toBe(85);
    const unverified = computeSiteReady([cred({ expiresAt: null, verified: false })], today);
    expect(unverified.score).toBe(60);
  });

  it("maps score bands to ready / nearly / not_ready", () => {
    const ready = computeSiteReady([cred({}), cred({}), cred({}), cred({}), cred({})], today);
    expect(ready.status).toBe("ready");
    const nearly = computeSiteReady(
      [cred({ verified: false }), cred({ expiresAt: "2026-06-20" })],
      today,
    );
    expect(nearly.status).toBe("nearly"); // (0.7 + 0.4)/2 = 55
    const notReady = computeSiteReady(
      [cred({ expiresAt: "2026-06-13" }), cred({ expiresAt: "2026-06-20" })],
      today,
    );
    expect(notReady.status).toBe("not_ready"); // (0 + 0.4)/2 = 20
  });
});
