import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWholeSalerToText1746000000005
  implements MigrationInterface
{
  name = 'ChangeWholeSalerToText1746000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambiar el tipo de columna wholeSaler de varchar(100) a text
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "wholeSaler" TYPE text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir el cambio: volver a varchar(100)
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "wholeSaler" TYPE character varying(100);
    `);
  }
}

