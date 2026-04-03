import { describe, expect, it } from "vitest";
import { calculateCuttingPlan, parsePipeItem } from "./rubberCuttingCalculator";

describe("rubberCuttingCalculator", () => {
  describe("parseNb (via parsePipeItem)", () => {
    it("parses '100 NB' with space", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.nbMm).toBe(100);
    });

    it("parses '200NB' without space", () => {
      const result = parsePipeItem("1", "200NB PIPE 6000 LG", 1, null, null);
      expect(result.nbMm).toBe(200);
    });

    it("is case insensitive", () => {
      const result = parsePipeItem("1", "150 nb PIPE 6000 LG", 1, null, null);
      expect(result.nbMm).toBe(150);
    });

    it("returns null when NB missing", () => {
      const result = parsePipeItem("1", "PIPE 6000 LG", 1, null, null);
      expect(result.nbMm).toBe(null);
      expect(result.isValidPipe).toBe(false);
    });
  });

  describe("parseLength (via parsePipeItem)", () => {
    it("parses '6000 LG' format", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.lengthMm).toBe(6000);
    });

    it("parses '6000LG' without space", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000LG", 1, null, null);
      expect(result.lengthMm).toBe(6000);
    });

    it("parses '300mm' format", () => {
      const result = parsePipeItem("1", "100 NB PIPE 300mm", 1, null, null);
      expect(result.lengthMm).toBe(300);
    });

    it("parses '6.1 M' format converting to mm", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6.1 M", 1, null, null);
      expect(result.lengthMm).toBe(6100);
    });

    it("returns 0 when length missing", () => {
      const result = parsePipeItem("1", "100 NB PIPE", 1, null, null);
      expect(result.lengthMm).toBe(0);
      expect(result.isValidPipe).toBe(false);
    });
  });

  describe("parseSchedule (via parsePipeItem)", () => {
    it("parses 'SCH 40'", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCH 40 6000 LG", 1, null, null);
      expect(result.schedule).toBe("Sch 40");
    });

    it("parses 'SCHEDULE 80'", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCHEDULE 80 6000 LG", 1, null, null);
      expect(result.schedule).toBe("Sch 80");
    });

    it("parses 'SCH 10S' with suffix", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCH 10S 6000 LG", 1, null, null);
      expect(result.schedule).toBe("Sch 10S");
    });

    it("parses 'STD' as Sch Std", () => {
      const result = parsePipeItem("1", "100 NB PIPE STD 6000 LG", 1, null, null);
      expect(result.schedule).toBe("Sch Std");
    });

    it("parses 'XS' as Sch 80", () => {
      const result = parsePipeItem("1", "100 NB PIPE XS 6000 LG", 1, null, null);
      expect(result.schedule).toBe("Sch 80");
    });

    it("returns null when schedule missing", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.schedule).toBe(null);
    });
  });

  describe("parseFlangeConfig (via parsePipeItem)", () => {
    it("parses FBE as both_ends", () => {
      const result = parsePipeItem("1", "100 NB PIPE FBE 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("both_ends");
    });

    it("parses FOE as one_end", () => {
      const result = parsePipeItem("1", "100 NB PIPE FOE 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("one_end");
    });

    it("parses PE as plain_ends", () => {
      const result = parsePipeItem("1", "100 NB PIPE PE 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("plain_ends");
    });

    it("parses L/FLG as loose_flange", () => {
      const result = parsePipeItem("1", "100 NB PIPE L/FLG 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("loose_flange");
    });

    it("parses 'FLG BOTH END' as both_ends", () => {
      const result = parsePipeItem("1", "100 NB PIPE FLG BOTH END 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("both_ends");
    });

    it("parses 'FLG 1 END' as one_end", () => {
      const result = parsePipeItem("1", "100 NB PIPE FLG 1 END 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe("one_end");
    });

    it("returns null when no flange config", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.flangeConfig).toBe(null);
    });
  });

  describe("parseItemType (via parsePipeItem)", () => {
    it("parses PIPE", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.itemType).toBe("pipe");
    });

    it("parses BEND", () => {
      const result = parsePipeItem("1", "100 NB BEND 6000 LG", 1, null, null);
      expect(result.itemType).toBe("bend");
    });

    it("parses ELBOW as bend", () => {
      const result = parsePipeItem("1", "100 NB ELBOW 6000 LG", 1, null, null);
      expect(result.itemType).toBe("bend");
    });

    it("parses REDUCER", () => {
      const result = parsePipeItem("1", "100 NB REDUCER 6000 LG", 1, null, null);
      expect(result.itemType).toBe("reducer");
    });

    it("parses TEE", () => {
      const result = parsePipeItem("1", "100 NB TEE 6000 LG", 1, null, null);
      expect(result.itemType).toBe("tee");
    });

    it("parses SPOOL", () => {
      const result = parsePipeItem("1", "100 NB SPOOL 6000 LG", 1, null, null);
      expect(result.itemType).toBe("spool");
    });

    it("returns null for unrecognised type", () => {
      const result = parsePipeItem("1", "100 NB WIDGET 6000 LG", 1, null, null);
      expect(result.itemType).toBe(null);
    });
  });

  describe("openEnds", () => {
    it("FBE (both_ends) gives 0 open ends", () => {
      const result = parsePipeItem("1", "100 NB PIPE FBE 6000 LG", 1, null, null);
      expect(result.openEnds).toBe(0);
    });

    it("FOE (one_end) gives 1 open end", () => {
      const result = parsePipeItem("1", "100 NB PIPE FOE 6000 LG", 1, null, null);
      expect(result.openEnds).toBe(1);
    });

    it("PE (plain_ends) gives 2 open ends", () => {
      const result = parsePipeItem("1", "100 NB PIPE PE 6000 LG", 1, null, null);
      expect(result.openEnds).toBe(2);
    });

    it("no config gives 2 open ends (default)", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.openEnds).toBe(2);
    });
  });

  describe("nbToOd", () => {
    it("maps 100 NB to 114.3 OD", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.odMm).toBeCloseTo(114.3, 1);
    });

    it("maps 200 NB to 219.1 OD", () => {
      const result = parsePipeItem("1", "200 NB PIPE 6000 LG", 1, null, null);
      expect(result.odMm).toBeCloseTo(219.1, 1);
    });

    it("maps 550 NB to 558.8 OD", () => {
      const result = parsePipeItem("1", "550 NB PIPE 6000 LG", 1, null, null);
      expect(result.odMm).toBeCloseTo(558.8, 1);
    });

    it("uses NB*1.1 fallback for unknown NB", () => {
      const result = parsePipeItem("1", "175 NB PIPE 6000 LG", 1, null, null);
      expect(result.odMm).toBeCloseTo(175 * 1.1, 1);
    });
  });

  describe("wallThickness", () => {
    it("uses Sch 40 table for known NB and schedule", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCH 40 6000 LG", 1, null, null);
      const expectedWt = 6.02;
      const expectedId = 114.3 - 2 * expectedWt;
      expect(result.idMm).toBeCloseTo(expectedId, 1);
    });

    it("defaults to Sch Std when no schedule given", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      const expectedWt = 6.02;
      const expectedId = 114.3 - 2 * expectedWt;
      expect(result.idMm).toBeCloseTo(expectedId, 1);
    });

    it("falls back to 6mm when NB not in schedule table", () => {
      const result = parsePipeItem("1", "175 NB PIPE SCH 40 6000 LG", 1, null, null);
      const od = 175 * 1.1;
      const expectedId = od - 2 * 6;
      expect(result.idMm).toBeCloseTo(expectedId, 1);
    });
  });

  describe("parsePipeItem rubber dimensions", () => {
    it("calculates rubberWidthMm from ID circumference rounded to 50mm", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCH 40 6000 LG", 1, null, null);
      const id = 114.3 - 2 * 6.02;
      const circumference = Math.PI * id;
      const expectedWidth = Math.ceil((circumference + 20) / 50) * 50;
      expect(result.rubberWidthMm).toBe(expectedWidth);
    });

    it("always adds +200mm end allowance plus bevel for internal lining", () => {
      const result = parsePipeItem("1", "100 NB PIPE PE 6000 LG", 1, null, null);
      expect(result.rubberLengthMm).toBe(6000 + 2 * 100 + 20);
    });

    it("adds flange turn-down for flanged end + open allowance for open end (FOE)", () => {
      const result = parsePipeItem("1", "100 NB PIPE FOE 6000 LG", 1, null, null);
      expect(result.rubberLengthMm).toBe(6000 + 53 + 100 + 20);
    });

    it("adds flange turn-down for both flanged ends (FBE)", () => {
      const result = parsePipeItem("1", "100 NB PIPE FBE 6000 LG", 1, null, null);
      expect(result.rubberLengthMm).toBe(6000 + 2 * 53 + 20);
    });

    it("sets isValidPipe true when NB and length present", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.isValidPipe).toBe(true);
    });

    it("sets isValidPipe false when NB missing", () => {
      const result = parsePipeItem("1", "PIPE 6000 LG", 1, null, null);
      expect(result.isValidPipe).toBe(false);
      expect(result.rubberWidthMm).toBe(0);
      expect(result.rubberLengthMm).toBe(0);
    });

    it("passes through m2 and itemNo", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 2, 5.5, "A001");
      expect(result.m2).toBe(5.5);
      expect(result.itemNo).toBe("A001");
      expect(result.quantity).toBe(2);
    });

    it("defaults stripsPerPiece to 1 for small pipes", () => {
      const result = parsePipeItem("1", "100 NB PIPE 6000 LG", 1, null, null);
      expect(result.stripsPerPiece).toBe(1);
    });
  });

  describe("550NB pipe parsing", () => {
    it("parses 550NB with correct OD", () => {
      const result = parsePipeItem("1", "550 NB PIPE 6000 LG", 1, null, null);
      expect(result.nbMm).toBe(550);
      expect(result.odMm).toBeCloseTo(558.8, 1);
      expect(result.isValidPipe).toBe(true);
    });

    it("uses Sch Std wall thickness for 550NB", () => {
      const result = parsePipeItem("1", "550 NB PIPE 6000 LG", 1, null, null);
      const expectedId = 558.8 - 2 * 9.53;
      expect(result.idMm).toBeCloseTo(expectedId, 1);
    });
  });

  describe("split-roll for large pipes", () => {
    it("splits 550NB into 2 strips", () => {
      const result = parsePipeItem("1", "550 NB PIPE 6000 LG", 1, null, null);
      expect(result.stripsPerPiece).toBe(2);
    });

    it("calculates correct strip width for 550NB", () => {
      const result = parsePipeItem("1", "550 NB PIPE 6000 LG", 1, null, null);
      const id = 558.8 - 2 * 9.53;
      const circumference = Math.PI * id;
      const expectedWidth = Math.ceil(circumference / 2 / 50) * 50;
      expect(result.rubberWidthMm).toBe(expectedWidth);
    });

    it("expands 550NB qty=1 into 2 cut pieces", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "550 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      const totalCuts = plan.rolls.reduce((sum, roll) => sum + roll.cuts.length, 0);
      expect(totalCuts).toBe(2);
    });

    it("expands 550NB qty=2 into 4 cut pieces", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "550 NB PIPE 6000 LG", quantity: 2, m2: null },
      ]);
      const totalCuts = plan.rolls.reduce((sum, roll) => sum + roll.cuts.length, 0);
      expect(totalCuts).toBe(4);
    });

    it("does not split small pipes", () => {
      const result = parsePipeItem("1", "400 NB PIPE 6000 LG", 1, null, null);
      expect(result.stripsPerPiece).toBe(1);
    });
  });

  describe("band-based roll spec (via calculateCuttingPlan)", () => {
    it("uses 3 lanes in band for narrow pipes (width <= 450mm)", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "50 NB PIPE 6000 LG", quantity: 3, m2: null },
      ]);
      expect(plan.hasPipeItems).toBe(true);
      expect(plan.rolls.length).toBeGreaterThan(0);
      const roll = plan.rolls[0];
      expect(roll.bands.length).toBeGreaterThan(0);
      expect(roll.bands[0].lanes).toBe(3);
    });

    it("uses 2 lanes in band for medium pipes (width 451-700mm)", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "200 NB PIPE 6000 LG", quantity: 2, m2: null },
      ]);
      expect(plan.hasPipeItems).toBe(true);
      const roll = plan.rolls[0];
      expect(roll.bands.length).toBeGreaterThan(0);
      expect(roll.bands[0].lanes).toBe(2);
    });

    it("uses 1 lane in band for wide pipes", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "400 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      expect(plan.hasPipeItems).toBe(true);
      const roll = plan.rolls[0];
      expect(roll.bands[0].lanes).toBe(1);
    });

    it("clamps roll width to minimum 800mm", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "15 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      const roll = plan.rolls[0];
      expect(roll.rollSpec.widthMm).toBeGreaterThanOrEqual(800);
    });

    it("clamps roll width to maximum 1450mm", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "1200 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      const roll = plan.rolls[0];
      expect(roll.rollSpec.widthMm).toBeLessThanOrEqual(1450);
    });

    it("calculates area as width * length in m2", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      const roll = plan.rolls[0];
      expect(roll.rollSpec.areaSqM).toBeCloseTo(
        (roll.rollSpec.widthMm / 1000) * roll.rollSpec.lengthM,
        2,
      );
    });
  });

  describe("calculateCuttingPlan", () => {
    it("returns empty plan for empty input", () => {
      const plan = calculateCuttingPlan([]);
      expect(plan.rolls).toEqual([]);
      expect(plan.totalRollsNeeded).toBe(0);
      expect(plan.hasPipeItems).toBe(false);
      expect(plan.genericM2Total).toBe(0);
    });

    it("handles valid pipe items", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      expect(plan.hasPipeItems).toBe(true);
      expect(plan.totalRollsNeeded).toBeGreaterThan(0);
      expect(plan.totalUsedSqM).toBeGreaterThan(0);
    });

    it("collects generic m2 items when pipe parsing fails", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: "PAINT COATING", itemDescription: null, quantity: 1, m2: 15.5 },
      ]);
      expect(plan.hasPipeItems).toBe(false);
      expect(plan.genericM2Items).toHaveLength(1);
      expect(plan.genericM2Items[0].m2).toBe(15.5);
      expect(plan.genericM2Total).toBe(15.5);
    });

    it("handles mixed pipe and generic items", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 6000 LG", quantity: 1, m2: null },
        { id: 2, itemCode: "PAINT", itemDescription: null, quantity: 1, m2: 10 },
      ]);
      expect(plan.hasPipeItems).toBe(true);
      expect(plan.genericM2Items).toHaveLength(1);
      expect(plan.genericM2Total).toBe(10);
    });

    it("expands quantity into separate cuts", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: 3, m2: null },
      ]);
      const totalCuts = plan.rolls.reduce((sum, roll) => sum + roll.cuts.length, 0);
      expect(totalCuts).toBe(3);
    });

    it("calculates waste percentage", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 6000 LG", quantity: 1, m2: null },
      ]);
      expect(plan.wastePercentage).toBeGreaterThan(0);
      expect(plan.wastePercentage).toBeLessThan(100);
      expect(plan.totalWasteSqM).toBeGreaterThan(0);
    });

    it("uses itemDescription or itemCode as description", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: "100 NB PIPE 6000 LG", itemDescription: null, quantity: 1, m2: null },
      ]);
      expect(plan.hasPipeItems).toBe(true);
    });

    it("handles null quantity as 1", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: null, m2: null },
      ]);
      const totalCuts = plan.rolls.reduce((sum, roll) => sum + roll.cuts.length, 0);
      expect(totalCuts).toBe(1);
    });

    it("ignores items with m2=0 that are not valid pipes", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: "SOMETHING", itemDescription: null, quantity: 1, m2: 0 },
      ]);
      expect(plan.hasPipeItems).toBe(false);
      expect(plan.genericM2Items).toHaveLength(0);
    });

    it("sums generic m2 from multiple items", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: "ITEM A", itemDescription: null, quantity: 1, m2: 10 },
        { id: 2, itemCode: "ITEM B", itemDescription: null, quantity: 1, m2: 25.5 },
      ]);
      expect(plan.genericM2Total).toBeCloseTo(35.5, 2);
    });
  });

  describe("optimizeCuttingWithLanes (via calculateCuttingPlan)", () => {
    it("places multiple items on same roll when they fit", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: 3, m2: null },
      ]);
      expect(plan.totalRollsNeeded).toBe(1);
    });

    it("spills to multiple rolls when items exceed roll length", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 10000 LG", quantity: 1, m2: null },
        { id: 2, itemCode: null, itemDescription: "100 NB PIPE 10000 LG", quantity: 1, m2: null },
        { id: 3, itemCode: null, itemDescription: "100 NB PIPE 10000 LG", quantity: 1, m2: null },
        { id: 4, itemCode: null, itemDescription: "100 NB PIPE 10000 LG", quantity: 1, m2: null },
      ]);
      expect(plan.totalRollsNeeded).toBeGreaterThan(1);
    });

    it("marks hasLengthwiseCut true when band has lanes > 1", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "50 NB PIPE 6000 LG", quantity: 3, m2: null },
      ]);
      const roll = plan.rolls[0];
      const hasMultiLaneBand = roll.bands.some((b) => b.lanes > 1);
      expect(roll.hasLengthwiseCut).toBe(hasMultiLaneBand);
    });
  });

  describe("roundUpToNearest (via rubberWidthMm)", () => {
    it("rounds circumference up to nearest 50mm", () => {
      const result = parsePipeItem("1", "100 NB PIPE SCH 40 6000 LG", 1, null, null);
      expect(result.rubberWidthMm % 50).toBe(0);
      expect(result.rubberWidthMm).toBeGreaterThan(0);
    });

    it("result is always a multiple of 50", () => {
      const sizes = [50, 100, 200, 300, 400, 500];
      sizes.forEach((nb) => {
        const result = parsePipeItem("1", `${nb} NB PIPE 6000 LG`, 1, null, null);
        if (result.isValidPipe) {
          expect(result.rubberWidthMm % 50).toBe(0);
        }
      });
    });
  });

  describe("band-based shelf packing", () => {
    it("packs mixed-width items (2x 600mm + 1x 750mm) onto 1 roll instead of 2", () => {
      const item600 = parsePipeItem("1", "200 NB PIPE 1000 LG", 1, null, "A001");
      const item750 = parsePipeItem("2", "219 OD PULLEY 1030 LONG", 1, null, "A002");

      const plan = calculateCuttingPlan([
        {
          id: 1,
          itemCode: null,
          itemDescription: "200 NB PIPE 1000 LG",
          quantity: 2,
          m2: null,
          itemNo: "A001",
        },
        {
          id: 2,
          itemCode: null,
          itemDescription: "219 OD PULLEY 1030 LONG",
          quantity: 1,
          m2: null,
          itemNo: "A002",
        },
      ]);

      expect(plan.totalRollsNeeded).toBe(1);
      expect(plan.rolls[0].bands.length).toBeGreaterThanOrEqual(2);
    });

    it("rotates band when it saves roll length", () => {
      const plan = calculateCuttingPlan([
        {
          id: 1,
          itemCode: null,
          itemDescription: "219 OD PULLEY 1030 LONG",
          quantity: 1,
          m2: null,
        },
      ]);

      const roll = plan.rolls[0];
      const band = roll.bands[0];
      const cut = roll.cuts[0];
      expect(band.heightMm).toBeLessThan(1030);
      expect(cut.lengthMm).toBeLessThan(cut.widthMm);
    });

    it("calculates offcuts for each roll", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: 1, m2: null },
      ]);

      expect(plan.rolls[0].offcuts.length).toBeGreaterThan(0);
      const totalOffcutArea = plan.rolls[0].offcuts.reduce((sum, o) => sum + o.areaSqM, 0);
      expect(totalOffcutArea).toBeGreaterThan(0);
    });

    it("aggregates offcuts across all rolls in CuttingPlan", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: 1, m2: null },
      ]);

      expect(plan.offcuts.length).toBeGreaterThan(0);
    });

    it("assigns band index to each cut piece", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "100 NB PIPE 2000 LG", quantity: 1, m2: null },
      ]);

      plan.rolls[0].cuts.forEach((cut) => {
        expect(typeof cut.band).toBe("number");
        expect(cut.band).toBeGreaterThanOrEqual(0);
      });
    });

    it("same-width items still use multi-lane within a band", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "50 NB PIPE 2000 LG", quantity: 3, m2: null },
      ]);

      const roll = plan.rolls[0];
      expect(roll.bands[0].lanes).toBe(3);
      expect(roll.cuts.length).toBe(3);
    });

    it("items exceeding roll length spill to second roll", () => {
      const plan = calculateCuttingPlan([
        { id: 1, itemCode: null, itemDescription: "300 NB PIPE 6000 LG", quantity: 3, m2: null },
      ]);

      expect(plan.totalRollsNeeded).toBeGreaterThanOrEqual(1);
      const totalCuts = plan.rolls.reduce((sum, r) => sum + r.cuts.length, 0);
      expect(totalCuts).toBe(3);
    });

    it("324 OD + 219 OD pulley example produces 1 roll with bands", () => {
      const plan = calculateCuttingPlan([
        {
          id: 1,
          itemCode: null,
          itemDescription: "324 OD PULLEY 600 LONG",
          quantity: 2,
          m2: null,
          itemNo: "B001",
        },
        {
          id: 2,
          itemCode: null,
          itemDescription: "219 OD PULLEY 1030 LONG",
          quantity: 1,
          m2: null,
          itemNo: "B002",
        },
      ]);

      expect(plan.totalRollsNeeded).toBe(1);
      expect(plan.rolls[0].bands.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("C/F (Center to Face) dimension parsing", () => {
    it("bend with C/F uses 2x C/F as total length", () => {
      const result = parsePipeItem("1", "500NB 90° BEND FBE 1600/3 C/F 1020", 1, null, "01");
      expect(result.itemType).toBe("bend");
      expect(result.centerToFaceMm).toBe(1020);
      expect(result.lengthMm).toBe(2040);
    });

    it("bend with C/F and mm suffix parses correctly", () => {
      const result = parsePipeItem("1", "80NB 90° 3D Bend C/F 455mm FBE", 1, null, "02");
      expect(result.centerToFaceMm).toBe(455);
      expect(result.lengthMm).toBe(910);
    });

    it("bend with AxB dimensions sums A+B as total length", () => {
      const result = parsePipeItem("1", "500NB 90° BEND 1020x2456 FBE 1600/3", 1, null, "03");
      expect(result.lengthMm).toBe(3476);
    });

    it("tee with C/F uses 3x C/F as total length", () => {
      const result = parsePipeItem("1", "500NB TEE FBE 1600/3 C/F 300", 1, null, "04");
      expect(result.itemType).toBe("tee");
      expect(result.centerToFaceMm).toBe(300);
      expect(result.lengthMm).toBe(900);
      expect(result.fittingRunLengthMm).toBe(600);
      expect(result.fittingBranchLengthMm).toBe(300);
      expect(result.branchNbMm).toBe(500);
    });

    it("bend C/F produces correct surface area", () => {
      const result = parsePipeItem("1", "500NB 90° BEND FBE 1600/3 C/F 1020", 1, null, "01");
      expect(result.calculatedExtM2).not.toBeNull();
      expect(result.calculatedExtM2!).toBeGreaterThan(3);
    });

    it("tee with AxB dims still uses existing fitting dim logic", () => {
      const result = parsePipeItem("1", "400x150NB 810x405 RED/TEE FAE 1000/3", 1, null, "09");
      expect(result.itemType).toBe("tee");
      expect(result.fittingRunLengthMm).toBe(810);
      expect(result.fittingBranchLengthMm).toBe(405);
    });
  });
});
