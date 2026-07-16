import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla role_pricing (lista de precios por categoría B2B) y siembra
 * una fila por cada categoría con 0% de recargo. El enum user_role ya incluye
 * los roles B2B tras la migración AddB2BRoles1746000000013.
 */
export class CreateRolePricing1746000000014 implements MigrationInterface {
  name = 'CreateRolePricing1746000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_pricing" (
        "id" SERIAL NOT NULL,
        "rol" "public"."user_role" NOT NULL,
        "percentage" numeric(5,2) NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_pricing" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_pricing_rol" UNIQUE ("rol")
      )
    `);

    // Seed: una fila por categoría B2B en 0% (idempotente).
    await queryRunner.query(`
      INSERT INTO "role_pricing" ("rol", "percentage")
      VALUES
        ('CLIENTE_MAYORISTA', 0),
        ('SUBMAYORISTA', 0),
        ('REVENDEDOR', 0),
        ('TALLER', 0)
      ON CONFLICT ("rol") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_pricing"`);
  }
}
