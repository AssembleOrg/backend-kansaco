import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Códigos Tango (SKU del ERP) por presentación. Una presentación puede tener
 * varios (ej. Tambor 200 L = 0010… y 0020…). `presentation` es el texto exacto
 * de una opción de product.presentation, como product_bulto / product_gama.
 * Solo crea una tabla nueva.
 */
export class CreateProductPresentationSku1746000000024 implements MigrationInterface {
  name = 'CreateProductPresentationSku1746000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_presentation_sku" (
        "productId" integer NOT NULL,
        "presentation" text NOT NULL,
        "sku" character varying(20) NOT NULL,
        CONSTRAINT "PK_product_presentation_sku" PRIMARY KEY ("productId", "presentation", "sku"),
        CONSTRAINT "FK_product_presentation_sku_product" FOREIGN KEY ("productId")
          REFERENCES "product"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_presentation_sku_sku" ON "product_presentation_sku" ("sku")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_presentation_sku"`);
  }
}
