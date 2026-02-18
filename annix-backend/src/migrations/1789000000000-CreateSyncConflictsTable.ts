import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSyncConflictsTable1789000000000 implements MigrationInterface {
  name = "CreateSyncConflictsTable1789000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE annix_rep_sync_conflicts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        meeting_id INT REFERENCES annix_rep_meetings(id) ON DELETE CASCADE,
        calendar_event_id INT REFERENCES annix_rep_calendar_events(id) ON DELETE CASCADE,
        conflict_type VARCHAR(20) NOT NULL,
        local_data JSONB NOT NULL,
        remote_data JSONB NOT NULL,
        resolution VARCHAR(20) DEFAULT 'pending',
        resolved_at TIMESTAMP,
        resolved_by INT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT chk_conflict_type CHECK (conflict_type IN ('time_overlap', 'data_conflict', 'deleted_locally', 'deleted_remotely')),
        CONSTRAINT chk_resolution CHECK (resolution IN ('pending', 'keep_local', 'keep_remote', 'merged', 'dismissed'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sync_conflicts_user_id ON annix_rep_sync_conflicts(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sync_conflicts_resolution ON annix_rep_sync_conflicts(resolution)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sync_conflicts_created_at ON annix_rep_sync_conflicts(created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_sync_conflicts_created_at");
    await queryRunner.query("DROP INDEX IF EXISTS idx_sync_conflicts_resolution");
    await queryRunner.query("DROP INDEX IF EXISTS idx_sync_conflicts_user_id");
    await queryRunner.query("DROP TABLE IF EXISTS annix_rep_sync_conflicts");
  }
}
