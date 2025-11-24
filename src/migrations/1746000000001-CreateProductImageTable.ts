import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImageTable1746000000001
  implements MigrationInterface
{
  name = 'CreateProductImageTable1746000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_image" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "imageUrl" character varying(500) NOT NULL,
        "imageKey" character varying(500) NOT NULL,
        "order" integer NOT NULL DEFAULT 0,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_image" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "product_image"
      ADD CONSTRAINT "FK_product_image_product"
      FOREIGN KEY ("productId")
      REFERENCES "product"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_image_productId"
      ON "product_image"("productId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_image_productId"`);
    await queryRunner.query(
      `ALTER TABLE "product_image" DROP CONSTRAINT IF EXISTS "FK_product_image_product"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "product_image"`);
  }
}

