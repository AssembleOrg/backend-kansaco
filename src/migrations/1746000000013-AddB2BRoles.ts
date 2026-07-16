import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega las categorías B2B SUBMAYORISTA, REVENDEDOR y TALLER al enum user_role.
 *
 * Sigue el patrón rename/recreate ya usado en este repo
 * (ver 1746000000000-UpdateUserAndAddDiscount) en lugar de `ALTER TYPE ... ADD VALUE`,
 * que puede fallar dentro de la transacción con la que TypeORM corre cada migración.
 *
 * Cada valor existente se mapea a sí mismo (`"rol"::text::user_role`), por lo que
 * no hay pérdida ni conversión de datos: es aditivo y no-breaking.
 */
export class AddB2BRoles1746000000013 implements MigrationInterface {
  name = 'AddB2BRoles1746000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
      )
    `);
    if (!enumExists[0].exists) {
      // Nada que migrar: no existe el enum todavía.
      await queryRunner.query(
        `CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA', 'ASISTENTE', 'SUBMAYORISTA', 'REVENDEDOR', 'TALLER')`,
      );
      return;
    }

    await queryRunner.query(
      `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA', 'ASISTENTE', 'SUBMAYORISTA', 'REVENDEDOR', 'TALLER')`,
    );

    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'rol'
      )
    `);
    if (columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "rol" TYPE "public"."user_role" USING "rol"::text::"public"."user_role"`,
      );
    }

    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir sólo es seguro si no hay filas con los roles nuevos.
    await queryRunner.query(
      `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA', 'ASISTENTE')`,
    );

    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'rol'
      )
    `);
    if (columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "rol" TYPE "public"."user_role" USING "rol"::text::"public"."user_role"`,
      );
    }

    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);
  }
}
