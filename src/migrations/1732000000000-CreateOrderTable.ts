import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderTable1732000000000 implements MigrationInterface {
  name = 'CreateOrderTable1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para tipo de cliente
    await queryRunner.query(`
      CREATE TYPE "customer_type" AS ENUM ('CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA')
    `);

    // Crear enum para estado de orden
    await queryRunner.query(`
      CREATE TYPE "order_status" AS ENUM ('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'COMPLETADO', 'CANCELADO')
    `);

    // Crear tabla order
    await queryRunner.query(`
      CREATE TABLE "order" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "customerType" "customer_type" NOT NULL,
        "status" "order_status" NOT NULL DEFAULT 'PENDIENTE',
        "contactInfo" jsonb NOT NULL,
        "businessInfo" jsonb,
        "items" jsonb NOT NULL,
        "totalAmount" numeric(10,2),
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_id" PRIMARY KEY ("id")
      )
    `);

    // Crear índice para búsqueda por userId
    await queryRunner.query(`
      CREATE INDEX "IDX_order_userId" ON "order" ("userId")
    `);

    // Crear índice para búsqueda por status
    await queryRunner.query(`
      CREATE INDEX "IDX_order_status" ON "order" ("status")
    `);

    // Crear índice para ordenamiento por fecha
    await queryRunner.query(`
      CREATE INDEX "IDX_order_createdAt" ON "order" ("createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.query(`DROP INDEX "IDX_order_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_order_status"`);
    await queryRunner.query(`DROP INDEX "IDX_order_userId"`);

    // Eliminar tabla
    await queryRunner.query(`DROP TABLE "order"`);

    // Eliminar enums
    await queryRunner.query(`DROP TYPE "order_status"`);
    await queryRunner.query(`DROP TYPE "customer_type"`);
  }
}
