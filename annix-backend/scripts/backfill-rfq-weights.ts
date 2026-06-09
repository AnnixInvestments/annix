/**
 * Backfill total_weight_kg for bend_rfqs and fitting_rfqs rows that
 * were persisted with null/0 weight before the HDPE-aware calc
 * branches landed.
 *
 * Strategy:
 *   - For each row, parse the rfq_items.description for HDPE markers
 *     (PE100, SDR N, PN N). Items whose descriptions contain HDPE
 *     markers get the HDPE toroidal-arc / equivalent-length-factor
 *     calc — mirroring what would happen on a fresh submit today.
 *   - Items without HDPE markers AND with the materialType-on-
 *     rfq_items flagged as steel get a steel fall-back using a wall
 *     thickness either parsed out of the description ("8mm wall
 *     thickness") or a sensible default for the nominal bore.
 *   - Items we can't compute confidently are listed but not updated.
 *
 * Usage:
 *   pnpm ts-node scripts/backfill-rfq-weights.ts --rfq-id 8 --dry-run
 *   pnpm ts-node scripts/backfill-rfq-weights.ts --rfq-id 8
 */

import { AppDataSource } from "../src/config/data-source";

const HDPE_DENSITY_KG_DM3 = 0.96;
const STEEL_DENSITY_KG_DM3 = 7.85;

// Bend-radius multiplier from the bend_type string ("1.5D", "3D"…).
function bendRadiusMultFromType(bendType: string | null | undefined): number {
  if (!bendType) return 1.5;
  const m = bendType.match(/^([\d.]+)D$/i);
  if (m) return Number(m[1]);
  return 1.5;
}

// Same equivalent-length-factor table the HDPE fitting helper uses.
function fittingEquivalentLengthM(odMm: number, fittingType: string | undefined): number {
  const od_m = odMm / 1000;
  switch (fittingType) {
    case "EQUAL_TEE":
    case "UNEQUAL_TEE":
      return 2.0 * od_m;
    case "SHORT_TEE":
    case "UNEQUAL_SHORT_TEE":
      return 1.8 * od_m;
    case "GUSSET_TEE":
    case "GUSSETTED_TEE":
    case "UNEQUAL_GUSSET_TEE":
      return 2.2 * od_m;
    case "SWEEP_TEE":
      return 3.0 * od_m;
    case "LATERAL":
    case "SABS719_LATERAL":
    case "Y_PIECE":
      return 2.5 * od_m;
    case "EQUAL_CROSS":
    case "UNEQUAL_CROSS":
      return 3.0 * od_m;
    case "ELBOW":
      return (Math.PI / 2) * 1.0 * od_m;
    case "MEDIUM_RADIUS_BEND":
    case "SWEEP_ELBOW":
    case "SWEEP_MEDIUM_RADIUS":
      return (Math.PI / 2) * 1.5 * od_m;
    case "LONG_RADIUS_BEND":
    case "SWEEP_LONG_RADIUS":
      return (Math.PI / 2) * 3.0 * od_m;
    case "OFFSET_BEND":
      return (Math.PI / 4) * 1.5 * od_m;
    case "CON_REDUCER":
    case "ECCENTRIC_REDUCER":
      return 1.5 * od_m;
    case "DUCKFOOT_SHORT":
      return (Math.PI / 2) * 1.5 * od_m;
    case "DUCKFOOT_GUSSETTED":
      return (Math.PI / 2) * 2.0 * od_m;
    default:
      return 2.0 * od_m;
  }
}

interface HdpeMarkers {
  peGrade?: string;
  sdr?: number;
  pn?: number;
}

function parseHdpeMarkers(description: string): HdpeMarkers {
  const isHdpe = /\bHDPE\b|\bPE\s*\d{2,4}\b|\bMDPE\b/i.test(description);
  if (!isHdpe) return {};
  const peMatch = description.match(/\bPE\s*(100|4710|80|63)\b/i);
  const sdrMatch = description.match(/\bSDR\s*([\d.]+)\b/i);
  const pnMatch = description.match(/\bPN\s*(\d+(?:\.\d+)?)\b/i);
  return {
    peGrade: peMatch ? `PE${peMatch[1]}`.toUpperCase() : "PE100",
    sdr: sdrMatch ? Number(sdrMatch[1]) : undefined,
    pn: pnMatch ? Number(pnMatch[1]) : undefined,
  };
}

// PE100 SDR→PN backup so we can derive SDR if only PN is in the
// description, or vice versa.
const HDPE_SDR_TO_PN: Array<[number, number]> = [
  [5, 40],
  [6, 32],
  [7.4, 25],
  [9, 20],
  [11, 16],
  [13.6, 12.5],
  [17, 10],
  [21, 8],
  [26, 6],
  [33, 5],
];

function hdpeSdrFromPn(pn: number | undefined): number | undefined {
  if (!pn) return undefined;
  const match = HDPE_SDR_TO_PN.find(([_sdr, p]) => p === pn);
  if (match) return match[0];
  // Fallback formula PN = 160 / (SDR - 1) for PE100 → SDR = 160/PN + 1
  return Math.round((160 / pn + 1) * 10) / 10;
}

// "8mm wall thickness", "8 mm WT", "wall thickness 8mm"
function parseWallThicknessMm(description: string): number | undefined {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*mm\s*wall\s*thickness/i,
    /wall\s*thickness\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*mm/i,
    /(\d+(?:\.\d+)?)\s*mm\s*W\.?T\.?/i,
    /\bWT\s*(\d+(?:\.\d+)?)\s*mm/i,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) {
      const v = Number(m[1]);
      if (v > 0 && v < 100) return v;
    }
  }
  return undefined;
}

// HDPE bend weight via toroidal-arc model.
function hdpeBendWeightKg(
  nbMm: number,
  sdr: number,
  bendDegrees: number,
  bendType: string | null | undefined,
  quantityValue: number,
): number {
  const wallMm = nbMm / sdr;
  const kgPerM = (Math.PI * wallMm * (nbMm - wallMm) * HDPE_DENSITY_KG_DM3) / 1000;
  const radiusMult = bendRadiusMultFromType(bendType);
  const arcLenM = (Math.PI * (bendDegrees / 180) * radiusMult * nbMm) / 1000;
  return Math.round(kgPerM * arcLenM * quantityValue * 100) / 100;
}

// HDPE fitting weight — mirrors hdpe-fitting-weights.ts logic so the
// script stays self-contained.
function hdpeFittingWeightKgLocal(
  nominalDiameterMm: number,
  fittingType: string | undefined,
  sdr: number,
  quantityValue: number,
): number {
  const wallMm = nominalDiameterMm / sdr;
  const kgPerM = (Math.PI * wallMm * (nominalDiameterMm - wallMm) * HDPE_DENSITY_KG_DM3) / 1000;
  const eqLenM = fittingEquivalentLengthM(nominalDiameterMm, fittingType);
  return Math.round(kgPerM * eqLenM * quantityValue * 100) / 100;
}

// Steel bend weight (toroidal-arc, same shape as HDPE but with steel
// density). Wall thickness required.
function steelBendWeightKg(
  nbMm: number,
  wallMm: number,
  bendDegrees: number,
  bendType: string | null | undefined,
  quantityValue: number,
): number {
  const kgPerM = (Math.PI * wallMm * (nbMm - wallMm) * STEEL_DENSITY_KG_DM3) / 1000;
  const radiusMult = bendRadiusMultFromType(bendType);
  const arcLenM = (Math.PI * (bendDegrees / 180) * radiusMult * nbMm) / 1000;
  return Math.round(kgPerM * arcLenM * quantityValue * 100) / 100;
}

function steelFittingWeightKg(
  nominalDiameterMm: number,
  wallMm: number,
  fittingType: string | undefined,
  quantityValue: number,
): number {
  const kgPerM = (Math.PI * wallMm * (nominalDiameterMm - wallMm) * STEEL_DENSITY_KG_DM3) / 1000;
  const eqLenM = fittingEquivalentLengthM(nominalDiameterMm, fittingType);
  return Math.round(kgPerM * eqLenM * quantityValue * 100) / 100;
}

interface ComputeResult {
  weightKg: number;
  basis: string;
}

function computeBendWeight(row: {
  description: string;
  nominal_bore_mm: number;
  wall_thickness_mm: number | null;
  bend_degrees: number;
  bend_type: string | null;
  quantity_value: number;
}): ComputeResult | null {
  const markers = parseHdpeMarkers(row.description);
  if (markers.sdr || markers.pn) {
    const sdr = markers.sdr ?? hdpeSdrFromPn(markers.pn);
    if (sdr) {
      const kg = hdpeBendWeightKg(
        Number(row.nominal_bore_mm),
        sdr,
        Number(row.bend_degrees),
        row.bend_type,
        Number(row.quantity_value),
      );
      return { weightKg: kg, basis: `HDPE ${markers.peGrade ?? "PE100"} SDR${sdr}` };
    }
  }
  // Steel branch — need wall thickness.
  let wt = row.wall_thickness_mm ? Number(row.wall_thickness_mm) : undefined;
  if (!wt) {
    wt = parseWallThicknessMm(row.description);
  }
  if (!wt) return null;
  const kg = steelBendWeightKg(
    Number(row.nominal_bore_mm),
    wt,
    Number(row.bend_degrees),
    row.bend_type,
    Number(row.quantity_value),
  );
  return { weightKg: kg, basis: `Steel WT${wt}mm` };
}

function computeFittingWeight(row: {
  description: string;
  nominal_diameter_mm: number;
  wall_thickness_mm: number | null;
  fitting_type: string;
  quantity_value: number;
}): ComputeResult | null {
  const markers = parseHdpeMarkers(row.description);
  if (markers.sdr || markers.pn) {
    const sdr = markers.sdr ?? hdpeSdrFromPn(markers.pn);
    if (sdr) {
      const kg = hdpeFittingWeightKgLocal(
        Number(row.nominal_diameter_mm),
        row.fitting_type,
        sdr,
        Number(row.quantity_value),
      );
      return { weightKg: kg, basis: `HDPE ${markers.peGrade ?? "PE100"} SDR${sdr}` };
    }
  }
  let wt = row.wall_thickness_mm ? Number(row.wall_thickness_mm) : undefined;
  if (!wt) {
    wt = parseWallThicknessMm(row.description);
  }
  if (!wt) return null;
  const kg = steelFittingWeightKg(
    Number(row.nominal_diameter_mm),
    wt,
    row.fitting_type,
    Number(row.quantity_value),
  );
  return { weightKg: kg, basis: `Steel WT${wt}mm` };
}

async function run(rfqId: number, dryRun: boolean) {
  console.log(`\n== Backfill RFQ id=${rfqId}  dryRun=${dryRun} ==\n`);
  await AppDataSource.initialize();

  const bends: Array<{
    id: number;
    rfq_item_id: number;
    line_number: number;
    description: string;
    nominal_bore_mm: number;
    wall_thickness_mm: number | null;
    bend_degrees: number;
    bend_type: string | null;
    quantity_value: number;
  }> = await AppDataSource.query(
    `SELECT br.id, br.rfq_item_id, ri.line_number, ri.description,
            br.nominal_bore_mm, br.wall_thickness_mm, br.bend_degrees,
            br.bend_type, br.quantity_value
       FROM bend_rfqs br
       JOIN rfq_items ri ON ri.id = br.rfq_item_id
      WHERE ri.rfq_id = $1
        AND COALESCE(br.total_weight_kg, 0) = 0
      ORDER BY ri.line_number`,
    [rfqId],
  );

  const fittings: Array<{
    id: number;
    rfq_item_id: number;
    line_number: number;
    description: string;
    nominal_diameter_mm: number;
    wall_thickness_mm: number | null;
    fitting_type: string;
    quantity_value: number;
  }> = await AppDataSource.query(
    `SELECT fr.id, fr.rfq_item_id, ri.line_number, ri.description,
            fr.nominal_diameter_mm, fr.wall_thickness_mm, fr.fitting_type,
            fr.quantity_value
       FROM fitting_rfqs fr
       JOIN rfq_items ri ON ri.id = fr.rfq_item_id
      WHERE ri.rfq_id = $1
        AND COALESCE(fr.total_weight_kg, 0) = 0
      ORDER BY ri.line_number`,
    [rfqId],
  );

  console.log(`Bends with 0 kg:    ${bends.length}`);
  console.log(`Fittings with 0 kg: ${fittings.length}\n`);

  const updates: Array<{
    table: "bend_rfqs" | "fitting_rfqs";
    typedId: number;
    rfqItemId: number;
    line: number;
    desc: string;
    weightKg: number;
    basis: string;
  }> = [];
  const skipped: Array<{ line: number; desc: string; reason: string }> = [];

  for (const b of bends) {
    const res = computeBendWeight(b);
    if (res) {
      updates.push({
        table: "bend_rfqs",
        typedId: b.id,
        rfqItemId: b.rfq_item_id,
        line: b.line_number,
        desc: b.description,
        weightKg: res.weightKg,
        basis: res.basis,
      });
    } else {
      skipped.push({ line: b.line_number, desc: b.description, reason: "no SDR/PN/WT" });
    }
  }
  for (const f of fittings) {
    const res = computeFittingWeight(f);
    if (res) {
      updates.push({
        table: "fitting_rfqs",
        typedId: f.id,
        rfqItemId: f.rfq_item_id,
        line: f.line_number,
        desc: f.description,
        weightKg: res.weightKg,
        basis: res.basis,
      });
    } else {
      skipped.push({ line: f.line_number, desc: f.description, reason: "no SDR/PN/WT" });
    }
  }

  console.log("--- Will update ---");
  for (const u of updates) {
    const shortDesc = u.desc.length > 70 ? `${u.desc.slice(0, 67)}...` : u.desc;
    console.log(
      `Line ${String(u.line).padStart(3)} ${u.table.padEnd(13)} ` +
        `${u.weightKg.toFixed(2).padStart(8)} kg  [${u.basis}]  ${shortDesc}`,
    );
  }
  console.log(`\nUpdates: ${updates.length}`);

  if (skipped.length) {
    console.log("\n--- Skipped (no spec data to compute) ---");
    for (const s of skipped) {
      const shortDesc = s.desc.length > 70 ? `${s.desc.slice(0, 67)}...` : s.desc;
      console.log(`Line ${String(s.line).padStart(3)} [${s.reason}]  ${shortDesc}`);
    }
  }

  if (!dryRun && updates.length) {
    console.log("\n--- Applying updates ---");
    await AppDataSource.transaction(async (manager) => {
      for (const u of updates) {
        await manager.query(`UPDATE ${u.table} SET total_weight_kg = $1 WHERE id = $2`, [
          u.weightKg,
          u.typedId,
        ]);
        await manager.query("UPDATE rfq_items SET total_weight_kg = $1 WHERE id = $2", [
          u.weightKg,
          u.rfqItemId,
        ]);
      }
    });
    console.log(`Applied ${updates.length} row updates (typed + rfq_items mirrored).`);
  } else if (dryRun) {
    console.log("\nDry run — no changes written.");
  }

  await AppDataSource.destroy();
}

const args = process.argv.slice(2);
const rfqIdArg = args.find((a) => a.startsWith("--rfq-id="));
const rfqIdArgPos = args.indexOf("--rfq-id");
const dryRun = args.includes("--dry-run");
let rfqId = 8;
if (rfqIdArg) {
  rfqId = Number(rfqIdArg.split("=")[1]);
} else if (rfqIdArgPos >= 0 && args[rfqIdArgPos + 1]) {
  rfqId = Number(args[rfqIdArgPos + 1]);
}
if (!rfqId || Number.isNaN(rfqId)) {
  console.error("Usage: backfill-rfq-weights.ts --rfq-id <id> [--dry-run]");
  process.exit(1);
}

run(rfqId, dryRun).catch((err) => {
  console.error(err);
  process.exit(1);
});
