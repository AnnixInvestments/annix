import { MigrationInterface, QueryRunner } from "typeorm";

interface CompoundDef {
  compound: string;
  compoundLegacy: string;
  scCode: string;
  pcCode: string;
  description: string;
}

const COMPOUNDS: CompoundDef[] = [
  {
    compound: "AU-A38-BSC",
    compoundLegacy: "AUA38BSC",
    scCode: "BSCA38",
    pcCode: "BPCA38",
    description: "38 Shore Black Compound - S.G. 1.04",
  },
  {
    compound: "AU-A40-BSC",
    compoundLegacy: "AUA40BSC",
    scCode: "BSCA40",
    pcCode: "BPCA40",
    description: "40 Shore Black Compound - S.G. 1.05",
  },
  {
    compound: "AU-A40-GSC",
    compoundLegacy: "AUA40GSC",
    scCode: "GSCA40",
    pcCode: "GPCA40",
    description: "40 Shore Green Compound - S.G. 1.05",
  },
  {
    compound: "AU-A40-RSC",
    compoundLegacy: "AUA40RSC",
    scCode: "RSCA40",
    pcCode: "RPCA40",
    description: "40 Shore Red Compound - S.G. 1.05",
  },
  {
    compound: "AU-A40-YSC",
    compoundLegacy: "AUA40YSC",
    scCode: "YSCA40",
    pcCode: "YPCA40",
    description: "40 Shore Yellow Compound - S.G. 1.05",
  },
  {
    compound: "AU-A60-BSC",
    compoundLegacy: "AUA60BSC",
    scCode: "BSCA60",
    pcCode: "BPCA60",
    description: "60 Shore Black Compound - S.G. 1.12",
  },
  {
    compound: "AU-A60-PRSC",
    compoundLegacy: "AUA60PRSC",
    scCode: "PRSCA60",
    pcCode: "PRPSC60",
    description: "60 Shore Premium Red Compound - S.G. 1.14",
  },
  {
    compound: "AU-A60-RSC",
    compoundLegacy: "AUA60RSC",
    scCode: "RSCA60",
    pcCode: "RPCA60",
    description: "60 Shore Red Compound - S.G. 1.14",
  },
  {
    compound: "AU-C50-BBSC",
    compoundLegacy: "AUC50BBSC",
    scCode: "BBSCC50",
    pcCode: "BBPCC50",
    description: "50 Shore Bromobutyl Black Compound - S.G. 1.16",
  },
  {
    compound: "AU-C50-NBRBR",
    compoundLegacy: "AUC50NBRBR",
    scCode: "NBRBRSCC50",
    pcCode: "NBRBRPCC50",
    description: "50 Shore Nitrile/Butadiene Blend Compound - S.G. 1.075",
  },
  {
    compound: "AU-C60-CBSC",
    compoundLegacy: "AUC60CBSC",
    scCode: "CBSCC60",
    pcCode: "CBPCC60",
    description: "60 Shore Chlorobutyl Black Compound - S.G. 1.13",
  },
  {
    compound: "AU-C60-NBRBSC",
    compoundLegacy: "AUC60NBRBSC",
    scCode: "NBRBRSCC60",
    pcCode: "NBRBRPCC60",
    description: "60 Shore Nitrile/Butadiene Blend Compound - S.G. 1.19",
  },
  {
    compound: "AU-C60-NBSC",
    compoundLegacy: "AUC60NBSC",
    scCode: "NSCC60",
    pcCode: "NPCC60",
    description: "60 Shore Nitrile Compound - S.G. 1.21",
  },
  {
    compound: "AU-A38-PPSC",
    compoundLegacy: "AUA38PPSC",
    scCode: "PPSCA38",
    pcCode: "PPPCA38",
    description: "38 Shore Premium Pink Compound - S.G. 0.98",
  },
];

interface BadCodeRename {
  from: string;
  to: string;
  newName: string;
  targetCompound: string;
}

const BAD_CODE_RENAMES: BadCodeRename[] = [
  {
    from: "RPCA38",
    to: "PPPCA38",
    newName: "38 Shore Premium Pink Compound (Pre Cured) - S.G. 0.98",
    targetCompound: "AU-A38-PPSC",
  },
  {
    from: "RSCA38",
    to: "PPSCA38",
    newName: "38 Shore Premium Pink Compound (Steam Cured) - S.G. 0.98",
    targetCompound: "AU-A38-PPSC",
  },
];

function variantName(description: string, variant: "Steam Cured" | "Pre Cured"): string {
  return description.replace(/Compound/i, `Compound (${variant})`);
}

function compoundAliases(c: CompoundDef): string[] {
  const base = [c.compoundLegacy, c.scCode, c.pcCode];
  const renameAliases = BAD_CODE_RENAMES.filter((r) => r.targetCompound === c.compound).map(
    (r) => r.from,
  );
  return [...base, ...renameAliases];
}

export class NormalizeRubberCompoundCodings1820100000044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const rename of BAD_CODE_RENAMES) {
      await queryRunner.query(
        `
        UPDATE rubber_product_coding
        SET code = $1,
            name = $2,
            aliases = COALESCE(aliases, '[]'::jsonb) || $3::jsonb,
            needs_review = false,
            updated_at = NOW()
        WHERE coding_type = 'COMPOUND' AND code = $4
        `,
        [rename.to, rename.newName, JSON.stringify([rename.from]), rename.from],
      );
    }

    for (const c of COMPOUNDS) {
      const aliases = compoundAliases(c);
      await queryRunner.query(
        `
        UPDATE rubber_product_coding
        SET code = $1,
            name = $2,
            aliases = $3::jsonb,
            needs_review = false,
            updated_at = NOW()
        WHERE coding_type = 'COMPOUND' AND code IN ($1, $4)
        `,
        [c.compound, c.description, JSON.stringify(aliases), c.compoundLegacy],
      );
      await queryRunner.query(
        `
        INSERT INTO rubber_product_coding (firebase_uid, coding_type, code, name, aliases, needs_review)
        SELECT $1::varchar, 'COMPOUND', $2::varchar, $3::varchar, $4::jsonb, false
        WHERE NOT EXISTS (
          SELECT 1 FROM rubber_product_coding WHERE coding_type = 'COMPOUND' AND code = $2::varchar
        )
        `,
        [
          `pg_seed_${c.compoundLegacy.toLowerCase()}`,
          c.compound,
          c.description,
          JSON.stringify(aliases),
        ],
      );
    }

    for (const c of COMPOUNDS) {
      const scName = variantName(c.description, "Steam Cured");
      const pcName = variantName(c.description, "Pre Cured");

      await queryRunner.query(
        `
        INSERT INTO rubber_product_coding (firebase_uid, coding_type, code, name, aliases, needs_review)
        SELECT $1::varchar, 'COMPOUND', $2::varchar, $3::varchar, '[]'::jsonb, false
        WHERE NOT EXISTS (
          SELECT 1 FROM rubber_product_coding WHERE coding_type = 'COMPOUND' AND code = $2::varchar
        )
        `,
        [`pg_seed_${c.scCode.toLowerCase()}`, c.scCode, scName],
      );
      await queryRunner.query(
        `
        UPDATE rubber_product_coding
        SET name = $1, needs_review = false, updated_at = NOW()
        WHERE coding_type = 'COMPOUND' AND code = $2 AND (name = code OR name = '(needs review)' OR name IS NULL)
        `,
        [scName, c.scCode],
      );

      await queryRunner.query(
        `
        INSERT INTO rubber_product_coding (firebase_uid, coding_type, code, name, aliases, needs_review)
        SELECT $1::varchar, 'COMPOUND', $2::varchar, $3::varchar, '[]'::jsonb, false
        WHERE NOT EXISTS (
          SELECT 1 FROM rubber_product_coding WHERE coding_type = 'COMPOUND' AND code = $2::varchar
        )
        `,
        [`pg_seed_${c.pcCode.toLowerCase()}`, c.pcCode, pcName],
      );
      await queryRunner.query(
        `
        UPDATE rubber_product_coding
        SET name = $1, needs_review = false, updated_at = NOW()
        WHERE coding_type = 'COMPOUND' AND code = $2 AND (name = code OR name = '(needs review)' OR name IS NULL)
        `,
        [pcName, c.pcCode],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down — this normalises seed data; reverting would require remembering each
    // row's pre-migration state, which we don't have.
  }
}
