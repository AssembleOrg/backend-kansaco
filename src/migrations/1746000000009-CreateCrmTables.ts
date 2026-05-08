import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmTables1746000000009 implements MigrationInterface {
  name = 'CreateCrmTables1746000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "lead_type" AS ENUM ('MAYORISTA', 'REVENDEDOR')`,
    );
    await queryRunner.query(
      `CREATE TYPE "terminal_kind" AS ENUM ('WON', 'LOST')`,
    );

    await queryRunner.query(`
      CREATE TABLE "vendor" (
        "id" SERIAL NOT NULL,
        "nombre" varchar(120) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vendor_nombre" UNIQUE ("nombre"),
        CONSTRAINT "PK_vendor" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "lead" (
        "id" SERIAL NOT NULL,
        "nombre" varchar(180) NOT NULL,
        "email" varchar(180),
        "telefono" varchar(40),
        "provincia" varchar(120),
        "ciudad" varchar(120),
        "tipo" "lead_type" NOT NULL DEFAULT 'MAYORISTA',
        "notasGenerales" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_tipo" ON "lead" ("tipo")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_ciudad" ON "lead" ("ciudad")`,
    );

    await queryRunner.query(`
      CREATE TABLE "pipeline_stage" (
        "id" SERIAL NOT NULL,
        "nombre" varchar(120) NOT NULL,
        "orden" integer NOT NULL,
        "color" varchar(20) NOT NULL DEFAULT '#64748b',
        "probability" integer NOT NULL DEFAULT 0,
        "isTerminal" boolean NOT NULL DEFAULT false,
        "terminalKind" "terminal_kind",
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pipeline_stage_nombre" UNIQUE ("nombre"),
        CONSTRAINT "PK_pipeline_stage" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_pipeline_stage_probability" CHECK ("probability" >= 0 AND "probability" <= 100),
        CONSTRAINT "CHK_pipeline_stage_terminal_kind" CHECK (
          ("isTerminal" = false AND "terminalKind" IS NULL) OR
          ("isTerminal" = true AND "terminalKind" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pipeline_stage_orden" ON "pipeline_stage" ("orden")`,
    );

    await queryRunner.query(`
      CREATE TABLE "terminal_reason" (
        "id" SERIAL NOT NULL,
        "stageId" integer NOT NULL,
        "motivo" varchar(120) NOT NULL,
        "orden" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_terminal_reason" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_terminal_reason_stage_motivo" UNIQUE ("stageId", "motivo"),
        CONSTRAINT "FK_terminal_reason_stage" FOREIGN KEY ("stageId")
          REFERENCES "pipeline_stage"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_terminal_reason_stageId" ON "terminal_reason" ("stageId")`,
    );

    const stages: Array<{
      nombre: string;
      orden: number;
      color: string;
      probability: number;
      isTerminal: boolean;
      terminalKind: 'WON' | 'LOST' | null;
    }> = [
      { nombre: 'Prospecto', orden: 1, color: '#94a3b8', probability: 5, isTerminal: false, terminalKind: null },
      { nombre: 'Oportunidad', orden: 2, color: '#60a5fa', probability: 10, isTerminal: false, terminalKind: null },
      { nombre: 'Reunión', orden: 3, color: '#3b82f6', probability: 20, isTerminal: false, terminalKind: null },
      { nombre: 'Visita Comercial', orden: 4, color: '#6366f1', probability: 30, isTerminal: false, terminalKind: null },
      { nombre: 'Lista Enviada', orden: 5, color: '#8b5cf6', probability: 40, isTerminal: false, terminalKind: null },
      { nombre: 'Generación de Presupuesto', orden: 6, color: '#a855f7', probability: 50, isTerminal: false, terminalKind: null },
      { nombre: 'Seguimiento', orden: 7, color: '#ec4899', probability: 60, isTerminal: false, terminalKind: null },
      { nombre: 'Facturación', orden: 8, color: '#f97316', probability: 90, isTerminal: false, terminalKind: null },
      { nombre: 'Aceptada', orden: 9, color: '#22c55e', probability: 100, isTerminal: true, terminalKind: 'WON' },
      { nombre: 'Perdida', orden: 10, color: '#ef4444', probability: 0, isTerminal: true, terminalKind: 'LOST' },
    ];

    const stageIdByName = new Map<string, number>();
    for (const s of stages) {
      const result = await queryRunner.query(
        `INSERT INTO "pipeline_stage"
          ("nombre", "orden", "color", "probability", "isTerminal", "terminalKind")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING "id"`,
        [s.nombre, s.orden, s.color, s.probability, s.isTerminal, s.terminalKind],
      );
      stageIdByName.set(s.nombre, result[0].id);
    }

    const reasons: Array<{ stage: string; motivo: string; orden: number }> = [
      { stage: 'Perdida', motivo: 'Precio', orden: 1 },
      { stage: 'Perdida', motivo: 'Distancia', orden: 2 },
      { stage: 'Perdida', motivo: 'No responde', orden: 3 },
      { stage: 'Aceptada', motivo: 'Precio', orden: 1 },
      { stage: 'Aceptada', motivo: 'Financiación', orden: 2 },
      { stage: 'Aceptada', motivo: 'Atención', orden: 3 },
    ];
    for (const r of reasons) {
      const stageId = stageIdByName.get(r.stage);
      if (stageId) {
        await queryRunner.query(
          `INSERT INTO "terminal_reason" ("stageId", "motivo", "orden")
           VALUES ($1, $2, $3)`,
          [stageId, r.motivo, r.orden],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_terminal_reason_stageId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "terminal_reason"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipeline_stage_orden"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pipeline_stage"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lead_ciudad"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lead_tipo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "vendor"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "terminal_kind"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_type"`);
  }
}
