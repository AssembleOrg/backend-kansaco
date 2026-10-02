import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gama de Tango por presentación (AAG/AMG/ABG aceites, GAG/GMG/GBG grasas).
 * `presentation` es el texto exacto de una opción de product.presentation, como product_bulto.
 * Solo crea una tabla nueva: no altera product.
 */
export class CreateProductGama1746000000023 implements MigrationInterface {
  name = 'CreateProductGama1746000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_gama" (
        "productId" integer NOT NULL,
        "presentation" text NOT NULL,
        "gama" character varying(3) NOT NULL,
        CONSTRAINT "PK_product_gama" PRIMARY KEY ("productId", "presentation"),
        CONSTRAINT "FK_product_gama_product" FOREIGN KEY ("productId")
          REFERENCES "product"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_product_gama" CHECK ("gama" IN ('AAG','AMG','ABG','GAG','GMG','GBG'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_gama"`);
  }
}
