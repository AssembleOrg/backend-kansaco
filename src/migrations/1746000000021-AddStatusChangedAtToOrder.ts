import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fecha del último cambio de estado (p. ej. "completados en agosto").
 * Backfill con updatedAt: aproximado, updatedAt también se mueve al editar notas.
 */
export class AddStatusChangedAtToOrder1746000000021 implements MigrationInterface {
  name = 'AddStatusChangedAtToOrder1746000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `UPDATE "order" SET "statusChangedAt" = "updatedAt" WHERE "statusChangedAt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "statusChangedAt" SET NOT NULL, ALTER COLUMN "statusChangedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_status_statusChangedAt" ON "order" ("status", "statusChangedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_status_statusChangedAt"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "statusChangedAt"`);
  }
}
