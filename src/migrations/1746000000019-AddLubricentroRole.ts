import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la categoría B2B LUBRICENTRO al enum user_role y su fila en role_pricing (0%).
 *
 * Mismo patrón rename/recreate que 1746000000013-AddB2BRoles. A diferencia de
 * aquella, ahora role_pricing.rol también usa el enum, así que se convierten ambas columnas.
 */
const OLD_VALUES = `'ADMIN', 'CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA', 'ASISTENTE', 'SUBMAYORISTA', 'REVENDEDOR', 'TALLER'`;
const NEW_VALUES = `${OLD_VALUES}, 'LUBRICENTRO'`;

export class AddLubricentroRole1746000000019 implements MigrationInterface {
  name = 'AddLubricentroRole1746000000019';

  private async recreateEnum(queryRunner: QueryRunner, values: string) {
    await queryRunner.query(
      `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM(${values})`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "rol" TYPE "public"."user_role" USING "rol"::text::"public"."user_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_pricing" ALTER COLUMN "rol" TYPE "public"."user_role" USING "rol"::text::"public"."user_role"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.recreateEnum(queryRunner, NEW_VALUES);
    await queryRunner.query(`
      INSERT INTO "role_pricing" ("rol", "percentage")
      VALUES ('LUBRICENTRO', 0)
      ON CONFLICT ("rol") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Los lubricentros vuelven a "Pendiente / Sin categoría".
    await queryRunner.query(
      `UPDATE "user" SET "rol" = 'CLIENTE_MINORISTA' WHERE "rol" = 'LUBRICENTRO'`,
    );
    await queryRunner.query(
      `DELETE FROM "role_pricing" WHERE "rol" = 'LUBRICENTRO'`,
    );
    await this.recreateEnum(queryRunner, OLD_VALUES);
  }
}
