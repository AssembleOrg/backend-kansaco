import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estados de pedido: PENDIENTE → RECIBIDO → PROCESANDO ("En proceso") → ENVIADO, o CANCELADO.
 * Se agrega RECIBIDO y se elimina COMPLETADO: los pedidos completados pasan a
 * ENVIADO (conservan su statusChangedAt).
 *
 * Mismo patrón rename/recreate que 1746000000019-AddLubricentroRole.
 */
const OLD_VALUES = `'PENDIENTE', 'PROCESANDO', 'ENVIADO', 'COMPLETADO', 'CANCELADO'`;
const NEW_VALUES = `'PENDIENTE', 'RECIBIDO', 'PROCESANDO', 'ENVIADO', 'CANCELADO'`;

export class UpdateOrderStatuses1746000000025 implements MigrationInterface {
  name = 'UpdateOrderStatuses1746000000025';

  private async recreateEnum(queryRunner: QueryRunner, values: string) {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."order_status" RENAME TO "order_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status" AS ENUM(${values})`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE "public"."order_status" USING "status"::text::"public"."order_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_old"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "order" SET "status" = 'ENVIADO' WHERE "status" = 'COMPLETADO'`,
    );
    await this.recreateEnum(queryRunner, NEW_VALUES);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Los RECIBIDO vuelven a PENDIENTE. Los que eran COMPLETADO quedan en ENVIADO (no se distinguen).
    await queryRunner.query(
      `UPDATE "order" SET "status" = 'PENDIENTE' WHERE "status" = 'RECIBIDO'`,
    );
    await this.recreateEnum(queryRunner, OLD_VALUES);
  }
}
