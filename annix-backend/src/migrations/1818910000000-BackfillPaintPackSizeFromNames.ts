import type { MigrationInterface, QueryRunner } from "typeorm";

const VOLUME_REGEX = "(\\d+(?:\\.\\d+)?)\\s*(?:l(?:tr?s?)?|litre?s?)";

export class BackfillPaintPackSizeFromNames1818910000000 implements MigrationInterface {
  name = "BackfillPaintPackSizeFromNames1818910000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE stock_items
       SET pack_size_litres = (regexp_match(name, $1, 'i'))[1]::numeric
       WHERE pack_size_litres IS NULL
         AND name ~* $1
         AND (
           category ILIKE '%paint%'
           OR name ILIKE '%paint%'
           OR name ILIKE '%primer%'
           OR name ILIKE '%topcoat%'
           OR name ILIKE '%hardener%'
           OR name ILIKE '%activator%'
           OR name ILIKE '%thinner%'
           OR name ILIKE '%penguard%'
           OR name ILIKE '%jotamastic%'
           OR name ILIKE '%hempadur%'
           OR name ILIKE '%hardtop%'
           OR name ILIKE '%epoxy%'
           OR name ILIKE '%polyurethane%'
           OR name ILIKE '%zinc%'
           OR name ILIKE '%alkyd%'
           OR name ILIKE '%sealer%'
           OR name ILIKE '%coating%'
           OR component_role IS NOT NULL
           OR component_group IS NOT NULL
         )`,
      [VOLUME_REGEX],
    );

    await queryRunner.query(
      `UPDATE sm_paint_product pp
       SET pack_size_litres = (regexp_match(ip.name, $1, 'i'))[1]::numeric
       FROM sm_issuable_product ip
       WHERE pp.product_id = ip.id
         AND pp.pack_size_litres IS NULL
         AND ip.name ~* $1`,
      [VOLUME_REGEX],
    );

    await queryRunner.query(
      `UPDATE sm_paint_product pp
       SET component_group_key = si.component_group,
           component_role = si.component_role
       FROM sm_issuable_product ip
       JOIN stock_items si ON si.id = ip.legacy_stock_item_id
       WHERE pp.product_id = ip.id
         AND pp.component_group_key IS NULL
         AND si.component_group IS NOT NULL`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
