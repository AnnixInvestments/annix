import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBendRfqTable1762759500000 implements MigrationInterface {
    name = 'CreateBendRfqTable1762759500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'bend' to the RfqItemType enum
        await queryRunner.query(`ALTER TYPE "rfq_items_item_type_enum" ADD VALUE 'bend'`);

        // Create the bend_rfqs table
        await queryRunner.query(`
            CREATE TABLE "bend_rfqs" (
                "id" SERIAL NOT NULL,
                "nominal_bore_mm" integer NOT NULL,
                "schedule_number" character varying(50) NOT NULL,
                "bend_type" character varying(10) NOT NULL,
                "bend_degrees" numeric(5,2) NOT NULL,
                "number_of_tangents" integer NOT NULL,
                "tangent_lengths" json NOT NULL,
                "quantity_value" numeric(10,2) NOT NULL,
                "quantity_type" character varying(50) NOT NULL,
                "working_pressure_bar" numeric(6,2) NOT NULL,
                "working_temperature_c" numeric(5,2) NOT NULL,
                "steel_specification_id" integer NOT NULL,
                "use_global_flange_specs" boolean NOT NULL DEFAULT true,
                "flange_standard_id" integer,
                "flange_pressure_class_id" integer,
                "total_weight_kg" numeric(10,2),
                "center_to_face_mm" numeric(10,2),
                "total_cost" numeric(12,2),
                "lead_time_days" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "rfq_item_id" integer,
                CONSTRAINT "REL_cd439a37b8b2bc118e33004885" UNIQUE ("rfq_item_id"),
                CONSTRAINT "PK_5c8713800bed948cebabc288ec6" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint to rfq_items
        await queryRunner.query(`
            ALTER TABLE "bend_rfqs" 
            ADD CONSTRAINT "FK_cd439a37b8b2bc118e33004885" 
            FOREIGN KEY ("rfq_item_id") 
            REFERENCES "rfq_items"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "bend_rfqs" DROP CONSTRAINT "FK_cd439a37b8b2bc118e33004885"`);
        
        // Drop the bend_rfqs table
        await queryRunner.query(`DROP TABLE "bend_rfqs"`);
        
        // Note: Cannot remove enum value from PostgreSQL enum type easily
        // This would require recreating the enum type
    }
}