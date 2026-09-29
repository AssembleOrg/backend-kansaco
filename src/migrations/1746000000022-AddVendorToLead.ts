import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vendedor responsable del lead (opcional). Aditiva y nullable: el backend
 * viejo sigue andando con la columna nueva, así que se corre ANTES del deploy.
 */
export class AddVendorToLead1746000000022 implements MigrationInterface {
  name = 'AddVendorToLead1746000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Columna + FK en una sola sentencia: si la columna ya existe se saltea todo.
    await queryRunner.query(
      `ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "vendorId" integer
        CONSTRAINT "FK_lead_vendor" REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lead_vendorId" ON "lead" ("vendorId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lead_vendorId"`);
    await queryRunner.query(`ALTER TABLE "lead" DROP CONSTRAINT IF EXISTS "FK_lead_vendor"`);
    await queryRunner.query(`ALTER TABLE "lead" DROP COLUMN IF EXISTS "vendorId"`);
  }
}
