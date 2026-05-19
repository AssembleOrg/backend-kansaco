import { MigrationInterface, QueryRunner } from 'typeorm';
import { slugify } from '../helpers/product.helper';

/**
 * Re-normaliza el campo `slug` de todos los productos a partir de su `name`,
 * usando la misma función `slugify` que aplica el código en tiempo de
 * creación/edición. En caso de colisión (dos productos cuyo nombre genera el
 * mismo slug), se sufija con `-{id}` para garantizar unicidad determinista
 * y que la migración sea idempotente.
 *
 * Esta migración no agrega un índice UNIQUE — solo limpia valores. Si en el
 * futuro se quiere imponer unicidad a nivel BD, agregarlo en otra migración
 * después de validar manualmente los slugs resultantes.
 */
export class NormalizeProductSlugs1746000000012 implements MigrationInterface {
  name = 'NormalizeProductSlugs1746000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const products: { id: number; name: string; slug: string }[] =
      await queryRunner.query(
        `SELECT id, name, slug FROM "product" ORDER BY id ASC`,
      );

    const usedSlugs = new Set<string>();
    let updated = 0;

    for (const p of products) {
      let newSlug = slugify(p.name ?? '');

      if (usedSlugs.has(newSlug)) {
        const suffix = `-${p.id}`;
        const base = newSlug
          .slice(0, Math.max(0, 120 - suffix.length))
          .replace(/-+$/g, '');
        newSlug = `${base}${suffix}`
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      usedSlugs.add(newSlug);

      if (newSlug !== p.slug) {
        await queryRunner.query(
          `UPDATE "product" SET "slug" = $1 WHERE "id" = $2`,
          [newSlug, p.id],
        );
        updated++;
      }
    }

    console.log(
      `[NormalizeProductSlugs] processed ${products.length} products, updated ${updated} slugs`,
    );
  }

  public async down(): Promise<void> {
    // No revertimos: el slug anterior podía contener caracteres inválidos
    // y no guardamos su valor original. Si se necesita rollback, restaurar
    // desde backup.
  }
}
