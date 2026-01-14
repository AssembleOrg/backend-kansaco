import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoryAndMigrate1746000000007
  implements MigrationInterface
{
  name = 'CreateCategoryAndMigrate1746000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla category
    await queryRunner.query(`
      CREATE TABLE "category" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_category_name" UNIQUE ("name"),
        CONSTRAINT "PK_category" PRIMARY KEY ("id")
      )
    `);

    // 2. Crear tabla intermedia product_category
    await queryRunner.query(`
      CREATE TABLE "product_category" (
        "productId" integer NOT NULL,
        "categoryId" integer NOT NULL,
        CONSTRAINT "PK_product_category" PRIMARY KEY ("productId", "categoryId")
      )
    `);

    // 3. Agregar foreign keys
    await queryRunner.query(`
      ALTER TABLE "product_category"
      ADD CONSTRAINT "FK_product_category_productId"
      FOREIGN KEY ("productId") REFERENCES "product"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_category"
      ADD CONSTRAINT "FK_product_category_categoryId"
      FOREIGN KEY ("categoryId") REFERENCES "category"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 4. Crear índices para mejor rendimiento
    await queryRunner.query(`
      CREATE INDEX "IDX_product_category_productId" ON "product_category" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_category_categoryId" ON "product_category" ("categoryId")
    `);

    // 5. Migrar datos existentes
    // Extraer todas las categorías únicas del array category en productos
    const products = await queryRunner.query(`
      SELECT id, category FROM "product" WHERE category IS NOT NULL AND array_length(category, 1) > 0
    `);

    // Crear un Set para almacenar categorías únicas
    const uniqueCategories = new Set<string>();

    // Extraer todas las categorías únicas
    for (const product of products) {
      if (product.category && Array.isArray(product.category)) {
        for (const cat of product.category) {
          if (cat && typeof cat === 'string' && cat.trim() !== '') {
            uniqueCategories.add(cat.trim());
          }
        }
      }
    }

    // Crear registros en la tabla category para cada categoría única
    const categoryMap = new Map<string, number>();

    for (const categoryName of uniqueCategories) {
      const result = await queryRunner.query(
        `
        INSERT INTO "category" ("name", "createdAt", "updatedAt")
        VALUES ($1, now(), now())
        ON CONFLICT ("name") DO NOTHING
        RETURNING "id"
      `,
        [categoryName],
      );

      if (result.length > 0) {
        categoryMap.set(categoryName, result[0].id);
      } else {
        // Si hubo conflicto, obtener el ID existente
        const existing = await queryRunner.query(
          `SELECT "id" FROM "category" WHERE "name" = $1`,
          [categoryName],
        );
        if (existing.length > 0) {
          categoryMap.set(categoryName, existing[0].id);
        }
      }
    }

    // 6. Crear relaciones en product_category
    for (const product of products) {
      if (product.category && Array.isArray(product.category)) {
        for (const catName of product.category) {
          if (catName && typeof catName === 'string' && catName.trim() !== '') {
            const categoryId = categoryMap.get(catName.trim());
            if (categoryId) {
              // Insertar relación si no existe
              await queryRunner.query(
                `
                INSERT INTO "product_category" ("productId", "categoryId")
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
              `,
                [product.id, categoryId],
              );
            }
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_category_categoryId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_category_productId"
    `);

    // Eliminar foreign keys
    await queryRunner.query(`
      ALTER TABLE "product_category"
      DROP CONSTRAINT IF EXISTS "FK_product_category_categoryId"
    `);

    await queryRunner.query(`
      ALTER TABLE "product_category"
      DROP CONSTRAINT IF EXISTS "FK_product_category_productId"
    `);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE IF EXISTS "product_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category"`);
  }
}
