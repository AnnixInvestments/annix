import { describe, expect, it } from "vitest";
import { pipeRowDescription } from "./description";

describe("pipeRowDescription", () => {
  describe("steel material", () => {
    it("formats steel pipe with schedule and steel spec", () => {
      const desc = pipeRowDescription(
        { materialType: "steel", specs: {} },
        100,
        "Sch40",
        6,
        "ASTM A106 Gr B",
        undefined,
        undefined,
        undefined,
        undefined,
        "PN16",
        null,
      );
      expect(desc).toContain("100NB");
      expect(desc).toContain("Sch40");
      expect(desc).toContain("ASTM A106 Gr B");
      expect(desc).toContain("Pipe x6m");
    });

    it("strips redundant 'Sch' prefix from schedule", () => {
      const desc = pipeRowDescription(
        { materialType: "steel", specs: {} },
        100,
        "Sch80",
        6,
        "ASTM A106 Gr B",
        undefined,
        undefined,
        undefined,
        undefined,
        "PN16",
        null,
      );
      // Result has 'Sch80' once, not 'SchSch80'
      expect(desc.match(/Sch/g)?.length).toBe(1);
    });

    it("appends flange suffix when pipeEndConfiguration is FBE", () => {
      const desc = pipeRowDescription(
        { materialType: "steel", specs: { pipeEndConfiguration: "FBE" } },
        100,
        "Sch40",
        6,
        "Steel",
        undefined,
        undefined,
        undefined,
        undefined,
        "PN16",
        null,
      );
      expect(desc).toContain("Flanged Both Ends PN16");
    });

    it("defaults materialType to 'steel' when missing", () => {
      const desc = pipeRowDescription(
        { specs: {} },
        100,
        "Sch40",
        6,
        "Steel",
        undefined,
        undefined,
        undefined,
        undefined,
        "PN16",
        null,
      );
      expect(desc).toContain("Steel Pipe");
    });
  });

  describe("HDPE material", () => {
    it("formats HDPE pipe with grade, SDR, and PN", () => {
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: {} },
        110,
        "",
        6,
        "",
        "PE100",
        11,
        undefined,
        "PN16",
        "",
        null,
      );
      expect(desc).toContain("110OD");
      expect(desc).toContain("PE100");
      expect(desc).toContain("SDR11");
      expect(desc).toContain("PN16");
      expect(desc).toContain("HDPE Pipe");
    });

    it("defaults grade to PE100 when not given", () => {
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: {} },
        110,
        "",
        6,
        "",
        undefined,
        11,
        undefined,
        "PN16",
        "",
        null,
      );
      expect(desc).toContain("PE100");
    });

    it("appends SANS 1123 stub-flange description for HDPE with global PN", () => {
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: {} },
        110,
        "",
        6,
        "",
        "PE100",
        11,
        undefined,
        "PN16",
        "",
        16,
      );
      expect(desc).toContain("SANS 1123");
    });

    it("appends stub-flange description from SDR when no global PN", () => {
      // SDR 11 → PN 16 → SANS 1123
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: {} },
        110,
        "",
        6,
        "",
        "PE100",
        11,
        undefined,
        undefined,
        "",
        null,
      );
      expect(desc).toContain("SANS 1123");
    });

    it("includes stub-end + backing-flange suffix when HDPE has FBE config", () => {
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: { pipeEndConfiguration: "FBE" } },
        110,
        "",
        6,
        "",
        "PE100",
        11,
        undefined,
        "PN16",
        "PN16",
        null,
      );
      expect(desc).toContain("Stub Both Ends w/ Backing Flange PN16");
    });

    it("omits SDR label when sdrNumber is undefined", () => {
      const desc = pipeRowDescription(
        { materialType: "hdpe", specs: {} },
        110,
        "",
        6,
        "",
        "PE100",
        undefined,
        undefined,
        "PN16",
        "",
        null,
      );
      expect(desc).not.toContain("SDR");
    });
  });

  describe("PVC material", () => {
    it("formats PVC pipe with type and PN", () => {
      const desc = pipeRowDescription(
        { materialType: "pvc", specs: {} },
        110,
        "",
        6,
        "",
        undefined,
        undefined,
        "uPVC",
        "PN10",
        "",
        null,
      );
      expect(desc).toContain("110OD");
      expect(desc).toContain("uPVC");
      expect(desc).toContain("PVC Pipe");
      expect(desc).toContain("PN10");
    });

    it("includes stub-flange suffix for PVC FBE config", () => {
      const desc = pipeRowDescription(
        { materialType: "pvc", specs: { pipeEndConfiguration: "FBE" } },
        110,
        "",
        6,
        "",
        undefined,
        undefined,
        "uPVC",
        "PN10",
        "PN10",
        null,
      );
      expect(desc).toContain("Stub Both Ends w/ Backing Flange PN10");
    });

    it("omits type label when pvcType is undefined", () => {
      const desc = pipeRowDescription(
        { materialType: "pvc", specs: {} },
        110,
        "",
        6,
        "",
        undefined,
        undefined,
        undefined,
        "PN10",
        "",
        null,
      );
      expect(desc).not.toContain("uPVC");
      expect(desc).toContain("PVC Pipe");
    });
  });
});
