import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPresentationToCartItems1746000000003
  implements MigrationInterface
{
  name = 'AddPresentationToCartItems1746000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna presentation a la tabla cart_items
    await queryRunner.addColumn(
      'cart_item',
      new TableColumn({
        name: 'presentation',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Opcional: Agregar índice para búsquedas frecuentes por presentación
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cart_item_presentation" 
      ON "cart_item"("presentation");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_cart_item_presentation";
    `);

    // Eliminar columna
    await queryRunner.dropColumn('cart_item', 'presentation');
  }
}

