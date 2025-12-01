import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProductColumnsLength1746000000006
  implements MigrationInterface
{
  name = 'UpdateProductColumnsLength1746000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambiar presentation de varchar(250) a text para soportar hasta 10000 caracteres
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "presentation" TYPE text;
    `);

    // Cambiar imageUrl de varchar(200) a varchar(250) para coincidir con el DTO
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "imageUrl" TYPE character varying(250);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir presentation: volver a varchar(250)
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "presentation" TYPE character varying(250);
    `);

    // Revertir imageUrl: volver a varchar(200)
    await queryRunner.query(`
      ALTER TABLE "product" 
      ALTER COLUMN "imageUrl" TYPE character varying(200);
    `);
  }
}

