import {
  PVC_GRADE_LIST,
  PVC_GRADES,
  pvcGradeByCode,
  pvcGradesByApplication,
  pvcSafetyFactor,
} from "./grades";

describe("PVC grades", () => {
  it("covers PVC-U, PVC-M and PVC-O", () => {
    expect(PVC_GRADE_LIST).toEqual(["PVC-U", "PVC-M", "PVC-O"]);
  });

  it("orders by ascending hoop stress", () => {
    expect(PVC_GRADES["PVC-U"].mrsMpa).toBeLessThan(PVC_GRADES["PVC-M"].mrsMpa);
    expect(PVC_GRADES["PVC-M"].mrsMpa).toBeLessThan(PVC_GRADES["PVC-O"].mrsMpa);
  });

  it("design stress respects the catalogue safety factor (2.0)", () => {
    PVC_GRADE_LIST.forEach((code) => {
      const grade = PVC_GRADES[code];
      expect(grade.designStressMpa).toBeCloseTo(grade.mrsMpa / pvcSafetyFactor(), 5);
    });
  });

  it("pvcGradeByCode returns the grade record", () => {
    expect(pvcGradeByCode("PVC-O").mrsMpa).toBe(45);
  });

  it("pvcGradesByApplication filters by use case", () => {
    const waterGrades = pvcGradesByApplication("water");
    expect(waterGrades.map((g) => g.code)).toEqual(
      expect.arrayContaining(["PVC-U", "PVC-M", "PVC-O"]),
    );

    const sewerGrades = pvcGradesByApplication("sewer");
    expect(sewerGrades.map((g) => g.code)).toEqual(["PVC-U"]);
  });

  it("every grade has at least one SANS specification reference", () => {
    PVC_GRADE_LIST.forEach((code) => {
      const grade = PVC_GRADES[code];
      const hasSansRef = grade.specifications.some((s) => /SANS\s*966/.test(s));
      expect(hasSansRef).toBe(true);
    });
  });
});
