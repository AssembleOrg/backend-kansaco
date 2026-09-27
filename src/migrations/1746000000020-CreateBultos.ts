import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bultos de venta (Caja x 24, Pallet x 48…) y su asignación a producto + presentación.
 * Solo crea tablas nuevas: no altera product, order ni cart_item.
 */
export class CreateBultos1746000000020 implements MigrationInterface {
  name = 'CreateBultos1746000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bulto" (
        "id" SERIAL NOT NULL,
        "nombre" character varying(60) NOT NULL,
        "unidades" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bulto" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bulto_nombre" UNIQUE ("nombre"),
        CONSTRAINT "CHK_bulto_unidades" CHECK ("unidades" BETWEEN 1 AND 10000)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_bulto" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "presentation" text NOT NULL,
        "bultoId" integer NOT NULL,
        CONSTRAINT "PK_product_bulto" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_bulto" UNIQUE ("productId", "presentation", "bultoId"),
        CONSTRAINT "FK_product_bulto_product" FOREIGN KEY ("productId")
          REFERENCES "product"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_bulto_bulto" FOREIGN KEY ("bultoId")
          REFERENCES "bulto"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_bulto_bulto" ON "product_bulto" ("bultoId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_bulto"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bulto"`);
  }
}
