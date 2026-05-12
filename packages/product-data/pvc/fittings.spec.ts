import { describe, expect, it } from "vitest";
import { pvcCouplingDimension } from "./coupling-dimensions";
import { pvcElbowDimension } from "./elbow-dimensions";
import { pvcEndCapLength } from "./end-cap-dimensions";
import { pvcFlangeAdapterDimension } from "./flange-adapter-dimensions";
import { pvcReducerDimension } from "./reducer-dimensions";
import { pvcSaddleDimension } from "./saddle-dimensions";
import { pvcTeeDimension } from "./tee-dimensions";

describe("pvcElbowDimension", () => {
  it("returns the 90° centre-to-face for stocked DNs", () => {
    expect(pvcElbowDimension(110, 90)?.centerToFaceMm).toBe(88);
    expect(pvcElbowDimension(50, 45)?.centerToFaceMm).toBe(28);
  });

  it("returns null for an unknown DN", () => {
    expect(pvcElbowDimension(500, 90)).toBeNull();
  });
});

describe("pvcTeeDimension", () => {
  it("returns the equal-tee dimensions", () => {
    const tee = pvcTeeDimension(110, 110);
    expect(tee?.runCenterToFaceMm).toBe(88);
    expect(tee?.branchCenterToFaceMm).toBe(88);
  });

  it("returns the reducing-tee branch length keyed on branch DN", () => {
    const tee = pvcTeeDimension(110, 75);
    expect(tee?.runCenterToFaceMm).toBe(88);
    expect(tee?.branchCenterToFaceMm).toBe(62);
  });

  it("returns null for an unstocked combination", () => {
    expect(pvcTeeDimension(20, 110)).toBeNull();
  });
});

describe("pvcReducerDimension", () => {
  it("returns the catalogue length for 110×75", () => {
    expect(pvcReducerDimension(110, 75)?.lengthMm).toBe(80);
  });

  it("returns null for an unstocked DN pair", () => {
    expect(pvcReducerDimension(500, 110)).toBeNull();
  });
});

describe("pvcEndCapLength", () => {
  it("returns the cap length for stocked DNs", () => {
    expect(pvcEndCapLength(110)).toBe(54);
    expect(pvcEndCapLength(160)).toBe(74);
  });

  it("returns null for an unstocked DN", () => {
    expect(pvcEndCapLength(500)).toBeNull();
  });
});

describe("pvcCouplingDimension", () => {
  it("returns slip coupling length for DN+family", () => {
    expect(pvcCouplingDimension(110, "slip")?.lengthMm).toBe(150);
  });

  it("returns RRJ coupling length", () => {
    expect(pvcCouplingDimension(250, "rrj")?.lengthMm).toBe(330);
  });

  it("returns null for an unsupported family on a DN", () => {
    // 20 mm doesn't have an RRJ coupling
    expect(pvcCouplingDimension(20, "rrj")).toBeNull();
  });
});

describe("pvcSaddleDimension", () => {
  it("returns threaded-outlet body length for stocked combos", () => {
    expect(pvcSaddleDimension(110, 25, "threaded_bsp")?.bodyLengthMm).toBe(120);
  });

  it("returns solvent-socket body length for stocked combos", () => {
    expect(pvcSaddleDimension(160, 63, "solvent_socket")?.bodyLengthMm).toBe(180);
  });

  it("returns null when outlet type doesn't match the stocked entry", () => {
    // 110×25 is threaded only, not solvent-socket
    expect(pvcSaddleDimension(110, 25, "solvent_socket")).toBeNull();
  });
});

describe("pvcFlangeAdapterDimension", () => {
  it("returns body + face OD for stocked DN", () => {
    const adapter = pvcFlangeAdapterDimension(110);
    expect(adapter?.bodyLengthMm).toBe(125);
    expect(adapter?.flangeFaceOdMm).toBe(240);
  });

  it("returns null for an unstocked DN", () => {
    expect(pvcFlangeAdapterDimension(20)).toBeNull();
  });
});
