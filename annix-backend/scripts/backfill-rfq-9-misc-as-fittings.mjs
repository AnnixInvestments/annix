// Phase 3 backfill: insert the 33 cleanly-classifiable misc entries
// from rfq_drafts.id=9 into RFQ id=8 (RFQ-2026-0009) as proper
// fitting_rfqs rows with computed weights. Mirrors the Phase 1/2
// logic so backfilled rows match what new submissions would produce.
//
// Skipped (require separate handling — see GitHub issue #294 for the
// NIX parent-NB inheritance bug):
//   - 12 steel "consumable" rows (DN 900 mild steel pipes / bends /
//     tees mis-classified as consumables by Nix)
//   - 6 valves (belong in valve_rfqs, not fitting_rfqs)
//   - 2 hand pumps (belong in pump_rfqs)
//
// Output: one SQL transaction with INSERT rfq_items + INSERT
// fitting_rfqs pairs. Each rfq_item insert returns the new id, but
// we can't use RETURNING in our serial inserts — instead we use
// WITH … RETURNING in pairs.

const HDPE_DENSITY = 0.96;
const PVC_DENSITY = 1.4;

// 33 backfillable rows. nb parsed from description, sdr derived
// from PE/PN markers or PVC pressure class.
const rows = [
  // === HDPE pipe boots ===
  {
    qty: 11,
    desc: "d) HDPE pipe boot for DN250 PE100 PN34 (SDR 6) pipe complete with stainless steel clamp and neoprene rubber",
    nix: "boot",
    mat: "hdpe",
    nb: 250,
    sdr: 6,
    fitting_type: "BOOT",
  },
  {
    qty: 3,
    desc: "g) HDPE pipe boot for DN200 PE100 PN25 (SDR 7.4) pipe complete with stainless steel clamp and neoprene rubber",
    nix: "boot",
    mat: "hdpe",
    nb: 200,
    sdr: 7.4,
    fitting_type: "BOOT",
  },
  {
    qty: 1,
    desc: "h) HDPE pipe boot for DN225 PE100 PN25 (SDR 7.4) pipe complete with stainless steel clamp and neoprene rubber",
    nix: "boot",
    mat: "hdpe",
    nb: 225,
    sdr: 7.4,
    fitting_type: "BOOT",
  },

  // === HDPE end caps ===
  {
    qty: 28,
    desc: "a) HDPE DN110 PE100 PN 20 (SDR 9) pipe end caps",
    nix: "end_cap",
    mat: "hdpe",
    nb: 110,
    sdr: 9,
    fitting_type: "END_CAP",
  },
  {
    qty: 3,
    desc: "a) HDPE DN200 PE100 PN 25 (SDR 7.4) pipe end caps",
    nix: "end_cap",
    mat: "hdpe",
    nb: 200,
    sdr: 7.4,
    fitting_type: "END_CAP",
  },
  {
    qty: 4,
    desc: "a) HDPE DN250 PE100 PN 34 (SDR 6) pipe end caps",
    nix: "end_cap",
    mat: "hdpe",
    nb: 250,
    sdr: 6,
    fitting_type: "END_CAP",
  },
  {
    qty: 23,
    desc: "a) HDPE DN250 PE100 PN 34 (SDR 6) pipe end caps",
    nix: "end_cap",
    mat: "hdpe",
    nb: 250,
    sdr: 6,
    fitting_type: "END_CAP",
  },
  {
    qty: 1,
    desc: "a) HDPE PE100 PN 25 (SDR 7.4) pipe end caps / 1) 355 mm diameter",
    nix: "end_cap",
    mat: "hdpe",
    nb: 355,
    sdr: 7.4,
    fitting_type: "END_CAP",
  },
  {
    qty: 3,
    desc: "b) HDPE DN225 PE100 PN 25 (SDR 7.4) pipe end caps",
    nix: "end_cap",
    mat: "hdpe",
    nb: 225,
    sdr: 7.4,
    fitting_type: "END_CAP",
  },

  // === HDPE laterals ===
  {
    qty: 18,
    desc: "b) HDPE DN110 PE100 PN 20 (SDR 9) 45deg laterals",
    nix: "lateral",
    mat: "hdpe",
    nb: 110,
    sdr: 9,
    fitting_type: "SABS719_LATERAL",
  },
  {
    qty: 14,
    desc: "b) HDPE DN250 PE100 PN 34 (SDR 6) 45deg laterals",
    nix: "lateral",
    mat: "hdpe",
    nb: 250,
    sdr: 6,
    fitting_type: "SABS719_LATERAL",
  },

  // === Steel laterals (rubber-lined mild steel) ===
  // 8mm wall thickness parsed from description
  {
    qty: 2,
    desc: "a) DN 400 rubber-lined mild steel ... 45 degree lateral T-Piece",
    nix: "lateral",
    mat: "steel",
    nb: 400,
    wt: 8,
    fitting_type: "SABS719_LATERAL",
  },
  {
    qty: 2,
    desc: "b) DN 450 rubber-lined mild steel ... 45 degree lateral T-Piece",
    nix: "lateral",
    mat: "steel",
    nb: 450,
    wt: 8,
    fitting_type: "SABS719_LATERAL",
  },

  // === HDPE puddle pipes ===
  {
    qty: 5,
    desc: "a) Cast in DN 110 HDPE puddle pipe (BL-1) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 110,
    sdr: 9,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 10,
    desc: "a) Cast in DN 560 HDPE puddle pipe (EOAL-1) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 560,
    sdr: 17,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 2,
    desc: "b) Cast in DN 160 HDPE puddle pipe (BL-2) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 160,
    sdr: 17,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 10,
    desc: "b) Cast in DN 250 HDPE puddle pipe (EOAL-2) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 250,
    sdr: 6,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 2,
    desc: "c) Cast in DN 400 HDPE puddle pipe (AL-1) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 400,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 8,
    desc: "c) Cast in DN 560 HDPE puddle pipe (EOBL-1) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 560,
    sdr: 17,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 24,
    desc: "d) Cast in DN 110 HDPE puddle pipe (EOBL-2) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 110,
    sdr: 9,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 3,
    desc: "d) Cast in DN 200 HDPE puddle pipe (AL-2) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 200,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 6,
    desc: "e) Cast in DN 250 HDPE puddle pipe (AL-3) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 250,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 2,
    desc: "f) Cast in DN 225 HDPE puddle pipe (AL-4) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 225,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 1,
    desc: "g) Cast in DN 355 HDPE puddle pipe (AL-5) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 355,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 1,
    desc: "h) Cast in DN 450 HDPE puddle pipe (AL-6) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 450,
    sdr: 7.4,
    fitting_type: "PUDDLE_PIPE",
  },
  {
    qty: 1,
    desc: "i) Cast in DN 630 HDPE puddle pipe (AL-7) c/w puddle flange and backing flange",
    nix: "puddle_pipe",
    mat: "hdpe",
    nb: 630,
    sdr: 17,
    fitting_type: "PUDDLE_PIPE",
  },

  // === UPVC Class 4 bends ===
  // Class 4 = PN4 = SDR 51 (SANS 966 mapping)
  {
    qty: 1,
    desc: "j) UPVC Class 4 22.5-degree bend / i) DN450",
    nix: "upvc",
    mat: "pvc",
    nb: 450,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 2,
    desc: "j) UPVC Class 4 22.5-degree bend / ii) DN400",
    nix: "upvc",
    mat: "pvc",
    nb: 400,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 1,
    desc: "j) UPVC Class 4 22.5-degree bend / iii) DN355",
    nix: "upvc",
    mat: "pvc",
    nb: 355,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 6,
    desc: "j) UPVC Class 4 22.5-degree bend / iv) DN250",
    nix: "upvc",
    mat: "pvc",
    nb: 250,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 2,
    desc: "j) UPVC Class 4 22.5-degree bend / v) DN225",
    nix: "upvc",
    mat: "pvc",
    nb: 225,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 3,
    desc: "j) UPVC Class 4 22.5-degree bend / vi) DN200",
    nix: "upvc",
    mat: "pvc",
    nb: 200,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
  {
    qty: 5,
    desc: "j) UPVC Class 4 22.5-degree bend / vii) DN110",
    nix: "upvc",
    mat: "pvc",
    nb: 110,
    sdr: 51,
    angle: 22.5,
    fitting_type: "MEDIUM_RADIUS_BEND",
  },
];

function pipeKgPerM(nb, wall, density) {
  return (Math.PI * wall * (nb - wall) * density) / 1000;
}

function computeWeight(r) {
  const density = r.mat === "hdpe" ? HDPE_DENSITY : r.mat === "pvc" ? PVC_DENSITY : 7.85;
  const wallMm = r.wt ?? r.nb / r.sdr;
  const kgPerM = pipeKgPerM(r.nb, wallMm, density);
  let perUnitKg = 0;

  switch (r.fitting_type) {
    case "END_CAP":
      // 0.8 × OD eq length (HDPE) / 0.5 × OD (PVC)
      perUnitKg = (kgPerM * ((r.mat === "hdpe" ? 0.8 : 0.5) * r.nb)) / 1000;
      break;
    case "BOOT":
      // 0.5 × OD eq length + clamp-mass term
      perUnitKg = (kgPerM * (0.5 * r.nb)) / 1000 + 0.005 * r.nb;
      break;
    case "PUDDLE_PIPE":
      // 1m pipe + 2 × DN^1.5/600 kg flanges (puddle + backing,
      // fit to SANS 1123 Table 1000/3 plate-flange masses).
      perUnitKg = kgPerM * 1.0 + 2 * (r.nb ** 1.5 / 600);
      break;
    case "SABS719_LATERAL":
      // 2.5 × OD eq length (covers run + branch)
      perUnitKg = (kgPerM * 2.5 * r.nb) / 1000;
      break;
    case "MEDIUM_RADIUS_BEND": {
      // Toroidal arc: arcLen = π × (angle/180) × 1.5 × OD
      const arcLen = (Math.PI * (r.angle / 180) * 1.5 * r.nb) / 1000;
      perUnitKg = kgPerM * arcLen;
      break;
    }
  }
  return Math.round(perUnitKg * r.qty * 100) / 100;
}

const startLine = 59; // RFQ-0009 max is 58.
let nextLine = startLine;
const sqlStatements = [];
let totalKg = 0;
console.log("line | mat  | nb  | type            | qty | weight kg | desc");
console.log("-----+------+-----+-----------------+-----+-----------+-----");
for (const r of rows) {
  const totalWeight = computeWeight(r);
  totalKg += totalWeight;
  const desc = r.desc.replace(/'/g, "''");
  const lineNo = nextLine++;
  console.log(
    `${String(lineNo).padStart(4)} | ${r.mat.padEnd(4)} | ${String(r.nb).padStart(3)} | ` +
      `${r.fitting_type.padEnd(15)} | ${String(r.qty).padStart(3)} | ${totalWeight.toFixed(2).padStart(9)} | ${r.desc.slice(0, 60)}`,
  );
  // Use CTE to chain rfq_items INSERT → fitting_rfqs INSERT via the
  // returned rfq_item id. Each becomes one statement in the
  // run_sql_transaction array.
  sqlStatements.push(
    `WITH new_item AS (
      INSERT INTO rfq_items (rfq_id, line_number, item_type, material_type, quantity, description, total_weight_kg)
      VALUES (8, ${lineNo}, 'fitting', '${r.mat}', ${r.qty}, '${desc}', ${totalWeight})
      RETURNING id
    )
    INSERT INTO fitting_rfqs (rfq_item_id, nominal_diameter_mm, schedule_number, fitting_type, fitting_standard, add_blank_flange, quantity_value, quantity_type, total_weight_kg)
    SELECT id, ${r.nb}, '', '${r.fitting_type}', 'SABS719', false, ${r.qty}, 'number_of_items', ${totalWeight}
    FROM new_item`,
  );
}
console.log(`\nTotal backfill weight: ${totalKg.toFixed(2)} kg across ${rows.length} rows`);
console.log(`\nSQL statements: ${sqlStatements.length}`);
// Print as JSON array literal so it can be pasted into a Neon
// run_sql_transaction call.
console.log("\n--- JSON statements for run_sql_transaction ---");
console.log(JSON.stringify(sqlStatements, null, 2));
