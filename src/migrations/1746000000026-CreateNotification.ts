import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Avisos al usuario (campanita): cambios de estado y de productos de sus
 * pedidos; a futuro, promociones por categoría.
 *
 * Puramente aditiva: crea una tabla nueva, no toca nada existente.
 */
export class CreateNotification1746000000026 implements MigrationInterface {
  name = 'CreateNotification1746000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification" (
        "id" SERIAL NOT NULL,
        "userId" uuid NOT NULL,
        "tipo" varchar(30) NOT NULL,
        "titulo" varchar(160) NOT NULL,
        "mensaje" text NOT NULL,
        "orderId" uuid,
        "leidaAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    // Listado de la campanita: avisos del usuario, más nuevos primero.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_user_createdAt" ON "notification" ("userId", "createdAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
  }
}
