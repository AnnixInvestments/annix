import {
  isPvcClassValidForGrade,
  PVC_PRESSURE_CLASS_LIST,
  PVC_PRESSURE_CLASSES,
  recommendedPvcClassForPressure,
  validPvcPressureClassesForGrade,
} from "./classes";

describe("PVC pressure classes", () => {
  it("registers Classes 6 through 40", () => {
    expect(PVC_PRESSURE_CLASS_LIST).toEqual([6, 9, 12, 16, 20, 25, 34, 40]);
  });

  it("class number equals pressure in bar", () => {
    PVC_PRESSURE_CLASS_LIST.forEach((cls) => {
      expect(PVC_PRESSURE_CLASSES[cls].ratedPressureBar).toBe(cls);
    });
  });

  it("PVC-O extends to Class 40, PVC-U stops at Class 25", () => {
    const uClasses = validPvcPressureClassesForGrade("PVC-U");
    const oClasses = validPvcPressureClassesForGrade("PVC-O");
    expect(uClasses).toEqual([6, 9, 12, 16, 20, 25]);
    expect(oClasses).toEqual([16, 20, 25, 34, 40]);
  });

  it("Class 34 is valid only for PVC-O", () => {
    expect(isPvcClassValidForGrade("PVC-U", 34)).toBe(false);
    expect(isPvcClassValidForGrade("PVC-M", 34)).toBe(false);
    expect(isPvcClassValidForGrade("PVC-O", 34)).toBe(true);
  });

  it("Class 6 is valid only for PVC-U", () => {
    expect(isPvcClassValidForGrade("PVC-U", 6)).toBe(true);
    expect(isPvcClassValidForGrade("PVC-M", 6)).toBe(false);
    expect(isPvcClassValidForGrade("PVC-O", 6)).toBe(false);
  });

  it("recommends the smallest catalogue class meeting the pressure", () => {
    expect(recommendedPvcClassForPressure("PVC-U", 10)).toBe(12);
    expect(recommendedPvcClassForPressure("PVC-U", 16)).toBe(16);
    expect(recommendedPvcClassForPressure("PVC-M", 17)).toBe(20);
  });

  it("returns null when no commercial class covers the pressure", () => {
    expect(recommendedPvcClassForPressure("PVC-U", 35)).toBeNull();
    expect(recommendedPvcClassForPressure("PVC-O", 50)).toBeNull();
  });
});
