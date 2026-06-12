import { NixAppRouterService } from "./nix-app-router.service";
import type { INixCapability } from "./nix-capability.interface";
import { NixCapabilityRegistry } from "./nix-capability-registry.service";

const capability = (key: string, appCode: string, intents: string[]): INixCapability =>
  ({
    key,
    appCode,
    label: key,
    description: key,
    intents,
  }) as INixCapability;

describe("NixAppRouterService (issue #262 Phase 5)", () => {
  const registry = new NixCapabilityRegistry();
  registry.register(capability("rfq.extract-boq", "rfq", ["extract boq", "upload boq"]));
  registry.register(capability("stock-control.create-job-card", "stock-control", ["job card"]));
  registry.register(
    capability("cv-assistant.post-job", "cv-assistant", ["post a job", "job posting"]),
  );
  registry.register(capability("cv-assistant.run-ee-report", "cv-assistant", ["ee report"]));
  registry.register(capability("au-rubber.coc", "au-rubber", ["job card"]));
  const router = new NixAppRouterService(registry);

  const context = {
    currentAppCode: "stock-control",
    accessibleAppCodes: ["stock-control", "rfq", "cv-assistant"],
  };

  it("ranks the current app's capability first", () => {
    const ranked = router.route("how do I create a job card", context);
    expect(ranked[0]?.capability.key).toBe("stock-control.create-job-card");
    expect(ranked[0]?.requiresAppSwitch).toBe(false);
  });

  it("never routes to an app the user cannot access (guard rail)", () => {
    const ranked = router.route("job card", context);
    expect(ranked.map((r) => r.capability.appCode)).not.toContain("au-rubber");
  });

  it("flags cross-app matches as requiring a switch", () => {
    const ranked = router.route("post a job", context);
    expect(ranked[0]?.capability.key).toBe("cv-assistant.post-job");
    expect(ranked[0]?.requiresAppSwitch).toBe(true);
  });

  it("uses recency to order foreign apps", () => {
    const ranked = router.route("job card", {
      currentAppCode: "cv-assistant",
      accessibleAppCodes: ["stock-control", "au-rubber", "cv-assistant"],
      recentAppCodes: ["au-rubber", "stock-control"],
    });
    expect(ranked.map((r) => r.capability.appCode)).toEqual(["au-rubber", "stock-control"]);
  });

  it("falls back to alphabetical for equally-ranked apps", () => {
    const ranked = router.route("job card", {
      currentAppCode: "rfq",
      accessibleAppCodes: ["stock-control", "au-rubber", "rfq"],
    });
    expect(ranked.map((r) => r.capability.appCode)).toEqual(["au-rubber", "stock-control"]);
  });

  it("best() returns null when nothing matches or nothing is accessible", () => {
    expect(router.best("nonsense phrase", context)).toBeNull();
    expect(router.best("job card", { currentAppCode: "rfq", accessibleAppCodes: [] })).toBeNull();
  });

  it("appsInScope intersects registered apps with the access list", () => {
    expect(router.appsInScope(context).sort()).toEqual(["cv-assistant", "rfq", "stock-control"]);
  });
});
