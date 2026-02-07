import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddLabelFieldsToNixExtractionRegions1778003000000 implements MigrationInterface {
  name = "AddLabelFieldsToNixExtractionRegions1778003000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "nix_extraction_regions",
      new TableColumn({
        name: "label_coordinates",
        type: "jsonb",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "nix_extraction_regions",
      new TableColumn({
        name: "label_text",
        type: "varchar",
        length: "200",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("nix_extraction_regions", "label_text");
    await queryRunner.dropColumn("nix_extraction_regions", "label_coordinates");
  }
}
