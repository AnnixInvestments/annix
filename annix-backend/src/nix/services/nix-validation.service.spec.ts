import { Test, TestingModule } from "@nestjs/testing";
import { NixValidationService, RfqItem } from "./nix-validation.service";

describe("NixValidationService", () => {
  let service: NixValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NixValidationService],
    }).compile();

    service = module.get<NixValidationService>(NixValidationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateItem", () => {
    describe("impossible combinations", () => {
      it("should flag error for large diameter pipe at Schedule 10", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 600,
          schedule: "Sch 10",
        };

        const issues = service.validateItem(item, { itemIndex: 0 });

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "error",
            field: "schedule",
            itemIndex: 0,
          }),
        );
      });

      it("should not flag Schedule 10 for smaller diameters", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          schedule: "Sch 10",
        };

        const issues = service.validateItem(item);
        const scheduleErrors = issues.filter(
          (i) => i.field === "schedule" && i.severity === "error",
        );

        expect(scheduleErrors.length).toBe(0);
      });

      it("should warn about stainless steel with flanges", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          material: "Stainless Steel",
          flangeConfig: "both_ends",
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "material",
          }),
        );
      });

      it("should warn about large reducer ratios", () => {
        const item: RfqItem = {
          itemType: "reducer",
          diameter: 400,
          secondaryDiameter: 150,
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "secondaryDiameter",
          }),
        );
      });

      it("should flag info for non-standard bend angles", () => {
        const item: RfqItem = {
          itemType: "bend",
          diameter: 200,
          angle: 37,
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "info",
            field: "angle",
          }),
        );
      });

      it("should not flag standard bend angles", () => {
        const standardAngles = [15, 30, 45, 60, 90];

        standardAngles.forEach((angle) => {
          const item: RfqItem = {
            itemType: "bend",
            diameter: 200,
            angle,
          };

          const issues = service.validateItem(item);
          const angleIssues = issues.filter((i) => i.field === "angle");

          expect(angleIssues.length).toBe(0);
        });
      });
    });

    describe("unusual patterns", () => {
      it("should warn about missing flange rating when flanges specified", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          flangeConfig: "both_ends",
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "flangeRating",
          }),
        );
      });

      it("should not warn when flange config is none", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          flangeConfig: "none",
        };

        const issues = service.validateItem(item);
        const flangeRatingIssues = issues.filter((i) => i.field === "flangeRating");

        expect(flangeRatingIssues.length).toBe(0);
      });

      it("should warn about wall thickness mismatch", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          schedule: "Sch 40",
          wallThickness: 15,
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "wallThickness",
          }),
        );
      });

      it("should flag info for pipe length exceeding 12m", () => {
        const item: RfqItem = {
          itemType: "pipe",
          diameter: 200,
          length: 15,
        };

        const issues = service.validateItem(item);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "info",
            field: "length",
          }),
        );
      });
    });
  });

  describe("validateRfq", () => {
    it("should validate all items in the RFQ", () => {
      const items: RfqItem[] = [
        { itemType: "pipe", diameter: 600, schedule: "Sch 10" },
        { itemType: "bend", diameter: 200, angle: 37 },
      ];

      const issues = service.validateRfq(items);

      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.some((i) => i.itemIndex === 0)).toBe(true);
      expect(issues.some((i) => i.itemIndex === 1)).toBe(true);
    });

    describe("cross-references", () => {
      it("should warn when reducer output does not match next item diameter", () => {
        const items: RfqItem[] = [
          { itemType: "reducer", diameter: 300, secondaryDiameter: 200 },
          { itemType: "pipe", diameter: 250 },
        ];

        const issues = service.validateRfq(items);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "secondaryDiameter",
            itemIndex: 0,
          }),
        );
      });

      it("should warn when item diameter does not match previous reducer output", () => {
        const items: RfqItem[] = [
          { itemType: "reducer", diameter: 300, secondaryDiameter: 200 },
          { itemType: "pipe", diameter: 250 },
        ];

        const issues = service.validateRfq(items);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "warning",
            field: "diameter",
            itemIndex: 1,
          }),
        );
      });

      it("should not warn when reducer output matches next item", () => {
        const items: RfqItem[] = [
          { itemType: "reducer", diameter: 300, secondaryDiameter: 200 },
          { itemType: "pipe", diameter: 200 },
        ];

        const issues = service.validateRfq(items);
        const mismatchIssues = issues.filter(
          (i) => i.field === "secondaryDiameter" && i.message.includes("but next item"),
        );

        expect(mismatchIssues.length).toBe(0);
      });
    });

    describe("consistency", () => {
      it("should flag mixed material grades when majority differs", () => {
        const items: RfqItem[] = [
          { itemType: "pipe", materialGrade: "ASTM A106 Grade B" },
          { itemType: "pipe", materialGrade: "ASTM A106 Grade B" },
          { itemType: "pipe", materialGrade: "ASTM A106 Grade B" },
          { itemType: "pipe", materialGrade: "ASTM A312 TP316" },
        ];

        const issues = service.validateRfq(items);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "info",
            field: "materialGrade",
            itemIndex: 3,
          }),
        );
      });

      it("should flag multiple different schedules", () => {
        const items: RfqItem[] = [
          { itemType: "pipe", schedule: "Sch 10" },
          { itemType: "pipe", schedule: "Sch 40" },
          { itemType: "pipe", schedule: "Sch 80" },
          { itemType: "pipe", schedule: "Sch 160" },
          { itemType: "pipe", schedule: "Sch 10" },
          { itemType: "pipe", schedule: "Sch 40" },
        ];

        const issues = service.validateRfq(items);

        expect(issues).toContainEqual(
          expect.objectContaining({
            severity: "info",
            field: "schedule",
          }),
        );
      });
    });
  });
});
