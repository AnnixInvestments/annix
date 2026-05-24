import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePromoCodes1820100002100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_code (
        id SERIAL PRIMARY KEY,
        code varchar(64) NOT NULL,
        description varchar(200) NOT NULL DEFAULT '',
        module_key varchar(64) NULL,
        discount_type varchar(16) NOT NULL,
        discount_value integer NOT NULL,
        applies_to_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
        assigned_company_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        billing_cycle varchar(16) NOT NULL DEFAULT 'any',
        discount_duration varchar(16) NOT NULL DEFAULT 'first_payment',
        duration_months integer NULL,
        max_redemptions integer NULL,
        times_redeemed integer NOT NULL DEFAULT 0,
        valid_from TIMESTAMPTZ NULL,
        valid_until TIMESTAMPTZ NULL,
        active boolean NOT NULL DEFAULT true,
        created_by_id integer NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_code_code ON promo_code (code)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_code_redemption (
        id SERIAL PRIMARY KEY,
        promo_code_id integer NOT NULL,
        company_id integer NOT NULL,
        subscription_id integer NULL,
        discount_applied_cents integer NOT NULL DEFAULT 0,
        redeemed_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_code_redemption_code_company
        ON promo_code_redemption (promo_code_id, company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS promo_code_redemption");
    await queryRunner.query("DROP TABLE IF EXISTS promo_code");
  }
}
