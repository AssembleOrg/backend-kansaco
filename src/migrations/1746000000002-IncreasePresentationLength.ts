import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreasePresentationLength1746000000002
  implements MigrationInterface
{
  name = 'IncreasePresentationLength1746000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Aumentar el length del campo presentation de 120 a 250
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "presentation" TYPE character varying(250);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir el cambio: volver a 120
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "presentation" TYPE character varying(120);
    `);
  }
}

