import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Logística de envío por orden (MÓDULO 3): `order.shippingInfo` (jsonb, nullable).
 * Guarda la modalidad (RETIRO | FLETE | EXPRESO) y las direcciones estructuradas
 * de entrega/despacho + empresa de transporte. Las órdenes previas quedan con
 * NULL (la vista cae al `contactInfo.address` legacy).
 */
export class AddShippingInfoToOrder1746000000018 implements MigrationInterface {
  name = 'AddShippingInfoToOrder1746000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN IF NOT EXISTS "shippingInfo" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN IF EXISTS "shippingInfo"`,
    );
  }
}
