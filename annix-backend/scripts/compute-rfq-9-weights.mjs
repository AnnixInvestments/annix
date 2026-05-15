// Standalone weight computer for RFQ-2026-0009 0-kg rows. Reads the
// 31-row dataset literal below (pulled from Neon SQL); emits a JSON
// report + UPDATE statements ready to apply via Neon MCP. Pure JS,
// no DB connection — runs in seconds.

const HDPE_DENSITY = 0.96; // kg/dm³
const STEEL_DENSITY = 7.85;

const rows = [
  {
    typed_id: 1078,
    rfq_item_id: 2849,
    line: 3,
    kind: "bend",
    nb: 250,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 6,
    desc: "HDPE DN250 PE100 PN 34 (SDR 6) 45deg bends",
  },
  {
    typed_id: 1080,
    rfq_item_id: 2852,
    line: 4,
    kind: "bend",
    nb: 250,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 6,
    desc: "HDPE DN250 PE100 PN 34 (SDR 6) 90deg bends",
  },
  {
    typed_id: 438,
    rfq_item_id: 2846,
    line: 8,
    kind: "fitting",
    nb: 110,
    wt: null,
    fitting_type: "EQUAL_TEE",
    qty: 6,
    desc: "HDPE DN110 PE100 PN 20 (SDR 9) T-pieces",
  },
  {
    typed_id: 1077,
    rfq_item_id: 2847,
    line: 9,
    kind: "bend",
    nb: 110,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 8,
    desc: "HDPE DN110 PE100 PN 20 (SDR 9) 45deg bends",
  },
  {
    typed_id: 1079,
    rfq_item_id: 2848,
    line: 10,
    kind: "bend",
    nb: 110,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 1,
    desc: "HDPE DN110 PE100 PN 20 (SDR 9) 90deg bends",
  },
  {
    typed_id: 1081,
    rfq_item_id: 2862,
    line: 11,
    kind: "bend",
    nb: 160,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 3,
    desc: "HDPE DN160 PE100 PN10 (SDR17) 45deg bends",
  },
  {
    typed_id: 1082,
    rfq_item_id: 2867,
    line: 21,
    kind: "bend",
    nb: 355,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 1,
    desc: "HDPE PE100 PN 25 (SDR 7.4) 90deg bends / 1) 355 mm",
  },
  {
    typed_id: 1086,
    rfq_item_id: 2874,
    line: 22,
    kind: "bend",
    nb: 355,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 1,
    desc: "HDPE PE100 PN 25 (SDR 7.4) 90deg bends / 1) 355 mm",
  },
  {
    typed_id: 1085,
    rfq_item_id: 2872,
    line: 23,
    kind: "bend",
    nb: 400,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 2,
    desc: "HDPE PE100 PN 25 (SDR 7.4) 90deg bends / 2) 400 mm",
  },
  {
    typed_id: 1087,
    rfq_item_id: 2875,
    line: 24,
    kind: "bend",
    nb: 450,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 1,
    desc: "HDPE PE100 PN 25 (SDR 7.4) 90deg bends / 3) 450 mm",
  },
  {
    typed_id: 440,
    rfq_item_id: 2873,
    line: 25,
    kind: "fitting",
    nb: 355,
    wt: null,
    fitting_type: "CON_REDUCER",
    qty: 1,
    desc: "HDPE PE100 PN 25 (SDR 7.4) reducers / 1) 400/355 mm",
  },
  {
    typed_id: 439,
    rfq_item_id: 2871,
    line: 26,
    kind: "fitting",
    nb: 250,
    wt: null,
    fitting_type: "CON_REDUCER",
    qty: 1,
    desc: "HDPE PE100 PN 25 (SDR 7.4) reducers / 2) 450/250 mm",
  },
  {
    typed_id: 1083,
    rfq_item_id: 2868,
    line: 29,
    kind: "bend",
    nb: 200,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 3,
    desc: "HDPE DN200 PE100 PN 25 (SDR 7.4) 45deg bends",
  },
  {
    typed_id: 1084,
    rfq_item_id: 2869,
    line: 30,
    kind: "bend",
    nb: 225,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 8,
    desc: "HDPE DN225 PE100 PN 25 (SDR 7.4) 90deg bends",
  },
  {
    typed_id: 1090,
    rfq_item_id: 2882,
    line: 32,
    kind: "bend",
    nb: 560,
    wt: null,
    degs: 90,
    bend_type: "1.5D",
    qty: 1,
    desc: "DN560 PE 100 PN 10 (SDR 17) HDPE / 90deg",
  },
  {
    typed_id: 1088,
    rfq_item_id: 2877,
    line: 33,
    kind: "bend",
    nb: 560,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 1,
    desc: "DN560 PE 100 PN 10 (SDR 17) HDPE / 45deg",
  },
  {
    typed_id: 1092,
    rfq_item_id: 2885,
    line: 34,
    kind: "bend",
    nb: 560,
    wt: null,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 6,
    desc: "DN560 PE 100 PN 10 (SDR 17) HDPE / 22.5deg",
  },
  {
    typed_id: 1091,
    rfq_item_id: 2879,
    line: 36,
    kind: "bend",
    nb: 630,
    wt: null,
    degs: 45,
    bend_type: "1.5D",
    qty: 3,
    desc: "DN630 PE 100 PN 10 (SDR 17) HDPE / 45deg",
  },
  {
    typed_id: 1089,
    rfq_item_id: 2878,
    line: 38,
    kind: "bend",
    nb: 400,
    wt: 8,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 2,
    desc: "DN 400 rubber-lined mild steel / 1) up to 45",
  },
  {
    typed_id: 441,
    rfq_item_id: 2883,
    line: 39,
    kind: "fitting",
    nb: 400,
    wt: 8,
    fitting_type: "EQUAL_TEE",
    qty: 2,
    desc: "DN 400 rubber-lined mild steel / Sweep T-Piece",
  },
  {
    typed_id: 442,
    rfq_item_id: 2884,
    line: 40,
    kind: "fitting",
    nb: 400,
    wt: 8,
    fitting_type: "EQUAL_TEE",
    qty: 2,
    desc: "DN 400 rubber-lined mild steel / Sweep T-Piece",
  },
  {
    typed_id: 445,
    rfq_item_id: 2893,
    line: 43,
    kind: "fitting",
    nb: 400,
    wt: 8,
    fitting_type: "CON_REDUCER",
    qty: 2,
    desc: "DN 400 x 450 Reducer (steel)",
  },
  {
    typed_id: 1095,
    rfq_item_id: 2895,
    line: 44,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 34,
    desc: "DN 450 steel / up to 22.5",
  },
  {
    typed_id: 1093,
    rfq_item_id: 2892,
    line: 45,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 11,
    desc: "DN 450 steel / 22.5-45",
  },
  {
    typed_id: 1094,
    rfq_item_id: 2894,
    line: 46,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 45,
    bend_type: "1.5D",
    qty: 4,
    desc: "DN 450 steel / 45-90",
  },
  {
    typed_id: 444,
    rfq_item_id: 2891,
    line: 47,
    kind: "fitting",
    nb: 450,
    wt: 8,
    fitting_type: "EQUAL_TEE",
    qty: 2,
    desc: "DN 450 steel Sweep T-Piece",
  },
  {
    typed_id: 443,
    rfq_item_id: 2890,
    line: 48,
    kind: "fitting",
    nb: 450,
    wt: 8,
    fitting_type: "EQUAL_TEE",
    qty: 2,
    desc: "DN 450 steel Sweep T-Piece",
  },
  {
    typed_id: 1097,
    rfq_item_id: 2902,
    line: 54,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 20,
    desc: "DN 450 steel / up to 22.5",
  },
  {
    typed_id: 1098,
    rfq_item_id: 2903,
    line: 55,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 22.5,
    bend_type: "1.5D",
    qty: 3,
    desc: "DN 450 steel / 22.5-45",
  },
  {
    typed_id: 1096,
    rfq_item_id: 2899,
    line: 56,
    kind: "bend",
    nb: 450,
    wt: 8,
    degs: 45,
    bend_type: "1.5D",
    qty: 3,
    desc: "DN 450 steel / 45-90",
  },
  {
    typed_id: 446,
    rfq_item_id: 2898,
    line: 57,
    kind: "fitting",
    nb: 450,
    wt: 8,
    fitting_type: "EQUAL_TEE",
    qty: 4,
    desc: "DN 450 Equal T-Piece (steel)",
  },
];

// SDR per row, parsed from description prior. Map keyed by typed_id
// for the HDPE rows; rest assumed steel.
const HDPE_SDR_BY_ID = {
  1078: 6,
  1080: 6,
  438: 9,
  1077: 9,
  1079: 9,
  1081: 17,
  1082: 7.4,
  1086: 7.4,
  1085: 7.4,
  1087: 7.4,
  440: 7.4,
  439: 7.4,
  1083: 7.4,
  1084: 7.4,
  1090: 17,
  1088: 17,
  1092: 17,
  1091: 17,
};

function bendRadiusMult(bt) {
  const m = (bt || "").match(/^([\d.]+)D$/i);
  return m ? Number(m[1]) : 1.5;
}

function pipeKgPerM(nb, wall, density) {
  // π × wall(mm) × (OD(mm) - wall(mm)) × density(kg/dm³) / 1000 → kg/m
  return (Math.PI * wall * (nb - wall) * density) / 1000;
}

function eqLenM(od, type) {
  switch (type) {
    case "EQUAL_TEE":
    case "UNEQUAL_TEE":
      return (2.0 * od) / 1000;
    case "CON_REDUCER":
    case "ECCENTRIC_REDUCER":
      return (1.5 * od) / 1000;
    case "ELBOW":
      return ((Math.PI / 2) * 1.0 * od) / 1000;
    case "MEDIUM_RADIUS_BEND":
    case "SWEEP_ELBOW":
    case "SWEEP_MEDIUM_RADIUS":
      return ((Math.PI / 2) * 1.5 * od) / 1000;
    case "LONG_RADIUS_BEND":
    case "SWEEP_LONG_RADIUS":
      return ((Math.PI / 2) * 3.0 * od) / 1000;
    default:
      return (2.0 * od) / 1000;
  }
}

const out = [];
for (const r of rows) {
  const sdr = HDPE_SDR_BY_ID[r.typed_id];
  let wallMm, density, basis;
  if (sdr) {
    wallMm = r.nb / sdr;
    density = HDPE_DENSITY;
    basis = `HDPE PE100 SDR${sdr} (wall=${wallMm.toFixed(2)}mm)`;
  } else {
    wallMm = r.wt;
    density = STEEL_DENSITY;
    basis = `Steel WT${wallMm}mm`;
  }
  const kgPerM = pipeKgPerM(r.nb, wallMm, density);
  let weight;
  if (r.kind === "bend") {
    const arc = (Math.PI * (r.degs / 180) * bendRadiusMult(r.bend_type) * r.nb) / 1000;
    weight = kgPerM * arc * r.qty;
  } else {
    weight = kgPerM * eqLenM(r.nb, r.fitting_type) * r.qty;
  }
  weight = Math.round(weight * 100) / 100;
  out.push({ ...r, weight, basis });
}

let lineSum = 0;
console.log("typed_id | line |  kind   | weight kg |  basis");
console.log("---------+------+---------+-----------+-----------------------------");
for (const r of out) {
  lineSum += r.weight;
  console.log(
    `${String(r.typed_id).padStart(8)} | ${String(r.line).padStart(4)} | ` +
      `${r.kind.padEnd(7)} | ${r.weight.toFixed(2).padStart(9)} | ${r.basis}`,
  );
}
console.log(`\nTotal weight added across ${out.length} rows: ${lineSum.toFixed(2)} kg\n`);

console.log("-- SQL UPDATEs (typed table + rfq_items mirror) --");
for (const r of out) {
  const table = r.kind === "bend" ? "bend_rfqs" : "fitting_rfqs";
  console.log(`UPDATE ${table} SET total_weight_kg = ${r.weight} WHERE id = ${r.typed_id};`);
  console.log(`UPDATE rfq_items SET total_weight_kg = ${r.weight} WHERE id = ${r.rfq_item_id};`);
}
