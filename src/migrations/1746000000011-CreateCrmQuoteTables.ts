import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmQuoteTables1746000000011 implements MigrationInterface {
  name = 'CreateCrmQuoteTables1746000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "quote_estado" AS ENUM ('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO')`,
    );

    await queryRunner.query(`
      CREATE TABLE "quote" (
        "id" SERIAL NOT NULL,
        "dealId" integer NOT NULL,
        "numero" varchar(40) NOT NULL,
        "titulo" varchar(200),
        "subtotal" numeric(14,2) NOT NULL DEFAULT 0,
        "ivaPorcentaje" numeric(5,2) NOT NULL DEFAULT 21,
        "ivaMonto" numeric(14,2) NOT NULL DEFAULT 0,
        "total" numeric(14,2) NOT NULL DEFAULT 0,
        "estado" "quote_estado" NOT NULL DEFAULT 'BORRADOR',
        "validoHasta" date,
        "formaPago" varchar(120) NOT NULL DEFAULT 'Transferencia Bancaria',
        "notas" text,
        "pdfUrl" varchar(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quote" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_quote_numero" UNIQUE ("numero"),
        CONSTRAINT "FK_quote_deal" FOREIGN KEY ("dealId")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_dealId" ON "quote" ("dealId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_estado" ON "quote" ("estado")`,
    );

    await queryRunner.query(`
      CREATE TABLE "quote_item" (
        "id" SERIAL NOT NULL,
        "quoteId" integer NOT NULL,
        "productId" integer,
        "productName" varchar(200) NOT NULL,
        "presentation" varchar(200),
        "cantidad" numeric(14,2) NOT NULL,
        "precioUnitario" numeric(14,2) NOT NULL,
        "subtotal" numeric(14,2) NOT NULL,
        "orden" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quote_item" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quote_item_quote" FOREIGN KEY ("quoteId")
          REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_quote_item_product" FOREIGN KEY ("productId")
          REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_item_quoteId" ON "quote_item" ("quoteId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quote_item_quoteId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quote_item"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quote_estado"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quote_dealId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quote"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "quote_estado"`);
  }
}
