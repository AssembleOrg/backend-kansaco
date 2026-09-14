import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Freno de cuentas: `user.bloqueo` (COBRANZAS | VENTAS | null). Una cuenta
 * frenada conserva su categoría pero no puede comprar; el cliente ve el aviso
 * "Comuníquese con el área de cobranzas" / "Comuníquese con ventas".
 */
export class AddBloqueoToUser1746000000017 implements MigrationInterface {
  name = 'AddBloqueoToUser1746000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_bloqueo'
      )
    `);
    if (!enumExists[0].exists) {
      await queryRunner.query(
        `CREATE TYPE "public"."user_bloqueo" AS ENUM('COBRANZAS', 'VENTAS')`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "bloqueo" "public"."user_bloqueo";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "bloqueo"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_bloqueo"`);
  }
}
