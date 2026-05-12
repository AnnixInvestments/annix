import {
  defaultPvcJoiningMethod,
  PVC_JOINING_METHOD_LIST,
  PVC_JOINING_METHODS,
  pvcJoiningMethodByCode,
  suitablePvcJoiningMethods,
} from "./joining-methods";

describe("PVC joining methods", () => {
  it("registers all six methods", () => {
    expect(PVC_JOINING_METHOD_LIST).toEqual([
      "solvent_cement",
      "rubber_ring_joint",
      "flanged",
      "threaded",
      "compression",
      "electrofusion_couplers",
    ]);
  });

  it("solvent_cement is restricted to small/medium PVC-U+PVC-M", () => {
    const method = pvcJoiningMethodByCode("solvent_cement");
    expect(method.sizeRangeMm.max).toBeLessThanOrEqual(250);
    expect(method.compatibleGrades).toEqual(["PVC-U", "PVC-M"]);
  });

  it("flanged covers every grade and the broadest class range", () => {
    const method = pvcJoiningMethodByCode("flanged");
    expect(method.compatibleGrades).toEqual(expect.arrayContaining(["PVC-U", "PVC-M", "PVC-O"]));
    expect(method.pressureClassRange.max).toBeGreaterThanOrEqual(25);
  });

  it("electrofusion_couplers requires special equipment + carries the highest cost factor", () => {
    const method = pvcJoiningMethodByCode("electrofusion_couplers");
    expect(method.requiresSpecialEquipment).toBe(true);
    PVC_JOINING_METHOD_LIST.filter((c) => c !== "electrofusion_couplers").forEach((code) => {
      expect(method.relativeCostFactor).toBeGreaterThanOrEqual(
        PVC_JOINING_METHODS[code].relativeCostFactor,
      );
    });
  });

  it("suitable methods at DN 110 / Class 16 / PVC-U include solvent_cement + rubber_ring_joint + flanged", () => {
    const methods = suitablePvcJoiningMethods({ dnMm: 110, pressureClass: 16, grade: "PVC-U" });
    const codes = methods.map((m) => m.code);
    expect(codes).toEqual(
      expect.arrayContaining(["solvent_cement", "rubber_ring_joint", "flanged"]),
    );
  });

  it("threaded drops out at DN 110 (size cap = 50 mm)", () => {
    const methods = suitablePvcJoiningMethods({ dnMm: 110, pressureClass: 16, grade: "PVC-U" });
    expect(methods.map((m) => m.code)).not.toContain("threaded");
  });

  it("solvent_cement drops out for PVC-O at any class (grade incompatible)", () => {
    const methods = suitablePvcJoiningMethods({ dnMm: 110, pressureClass: 16, grade: "PVC-O" });
    expect(methods.map((m) => m.code)).not.toContain("solvent_cement");
  });

  it("defaultPvcJoiningMethod picks flanged when a valve connection is needed", () => {
    const method = defaultPvcJoiningMethod({
      dnMm: 100,
      pressureClass: 16,
      grade: "PVC-U",
      needsValveConnection: true,
    });
    expect(method).toBe("flanged");
  });

  it("defaultPvcJoiningMethod picks solvent_cement for small bores", () => {
    const method = defaultPvcJoiningMethod({
      dnMm: 32,
      pressureClass: 12,
      grade: "PVC-U",
      needsValveConnection: false,
    });
    expect(method).toBe("solvent_cement");
  });

  it("defaultPvcJoiningMethod picks rubber_ring_joint for larger buried mains", () => {
    const method = defaultPvcJoiningMethod({
      dnMm: 250,
      pressureClass: 16,
      grade: "PVC-U",
      needsValveConnection: false,
    });
    expect(method).toBe("rubber_ring_joint");
  });

  it("defaultPvcJoiningMethod returns null when no method is suitable", () => {
    // DN 1000 doesn't exist in any PVC method range, and Class 6
    // isn't valid for PVC-O.
    const method = defaultPvcJoiningMethod({
      dnMm: 1000,
      pressureClass: 6,
      grade: "PVC-O",
      needsValveConnection: false,
    });
    expect(method).toBeNull();
  });
});
