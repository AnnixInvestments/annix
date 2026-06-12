export interface DrillingAuditRow {
  id: number;
  standardId: number | null;
  classDesignation: string;
  nominalDiameterMm: number;
  D: number;
  pcd: number;
  numHoles: number;
  d1: number;
}

export interface DrillingVariant {
  D: number;
  pcd: number;
  numHoles: number;
  d1: number;
  rowIds: number[];
  designations: string[];
}

export interface DrillingInconsistency {
  standardId: number | null;
  numericClass: number;
  nominalDiameterMm: number;
  variants: DrillingVariant[];
  majority: DrillingVariant | null;
}

export interface ImpossibleDrilling {
  row: DrillingAuditRow;
  reason: string;
}

// "1000/3" -> 1000, "PN16" -> 16, "Class 150" -> 150. Within one numeric table
// rating, every flange type shares drilling (D, PCD, hole count, hole diameter)
// for bolt interchangeability - only thickness and mass differ by type.
export function numericClassOf(designation: string): number | null {
  const match = (designation || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

const variantKey = (row: DrillingAuditRow): string =>
  [row.D, row.pcd, row.numHoles, row.d1].join("|");

export function auditFlangeDrillingConsistency(rows: DrillingAuditRow[]): DrillingInconsistency[] {
  const groups = rows.reduce((acc, row) => {
    const numericClass = numericClassOf(row.classDesignation);
    if (numericClass === null) return acc;
    const key = [row.standardId ?? "?", numericClass, row.nominalDiameterMm].join("|");
    const existing = acc.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      acc.set(key, {
        standardId: row.standardId,
        numericClass,
        dn: row.nominalDiameterMm,
        rows: [row],
      });
    }
    return acc;
  }, new Map<
    string,
    { standardId: number | null; numericClass: number; dn: number; rows: DrillingAuditRow[] }
  >());

  return Array.from(groups.values())
    .map((group) => {
      const variantMap = group.rows.reduce((acc, row) => {
        const key = variantKey(row);
        const existing = acc.get(key);
        if (existing) {
          existing.rowIds.push(row.id);
          existing.designations.push(row.classDesignation);
        } else {
          acc.set(key, {
            D: row.D,
            pcd: row.pcd,
            numHoles: row.numHoles,
            d1: row.d1,
            rowIds: [row.id],
            designations: [row.classDesignation],
          });
        }
        return acc;
      }, new Map<string, DrillingVariant>());

      const variants = Array.from(variantMap.values()).sort(
        (a, b) => b.rowIds.length - a.rowIds.length,
      );
      const top = variants[0];
      const second = variants[1];
      const majority =
        variants.length > 1 && top && (!second || top.rowIds.length > second.rowIds.length)
          ? top
          : null;

      return {
        standardId: group.standardId,
        numericClass: group.numericClass,
        nominalDiameterMm: group.dn,
        variants,
        majority,
      };
    })
    .filter((group) => group.variants.length > 1)
    .sort(
      (a, b) =>
        (a.standardId ?? 0) - (b.standardId ?? 0) ||
        a.numericClass - b.numericClass ||
        a.nominalDiameterMm - b.nominalDiameterMm,
    );
}

// A bolt circle at or outside the flange OD is physically impossible (the BS
// 4504 PN10 DN700-1000 rows shipped with D/PCD shifted); zero or negative
// drilling values are equally nonsensical.
export function findImpossibleDrillings(rows: DrillingAuditRow[]): ImpossibleDrilling[] {
  return rows.flatMap((row) => {
    if (row.pcd >= row.D) {
      return [{ row, reason: `PCD ${row.pcd} >= OD ${row.D} (bolt circle outside the plate)` }];
    }
    if (row.D <= 0 || row.pcd <= 0 || row.numHoles <= 0 || row.d1 <= 0) {
      return [{ row, reason: "non-positive drilling value" }];
    }
    if (row.pcd + row.d1 >= row.D) {
      return [
        {
          row,
          reason: `bolt holes break the flange edge (PCD ${row.pcd} + d1 ${row.d1} >= OD ${row.D})`,
        },
      ];
    }
    return [];
  });
}
