import { db } from '@utils/db';
import { sql } from 'drizzle-orm';
import type { UpdateManyBody } from '../models/update-many.model';

export const UpdateManyUseCase = {
  execute: async (body: UpdateManyBody): Promise<void> => {
    const ids = body.items.map((item) => item.id);

    // Build a single UPDATE ... CASE WHEN ... statement — one query, one connection.
    // e.g. UPDATE World SET randomNumber = CASE WHEN id=42 THEN 5812 WHEN id=891 THEN 2231 ... END WHERE id IN (42, 891, ...)
    const caseClause = sql.join(
      body.items.map((item) => sql`WHEN ${item.id} THEN ${item.randomNumber}`),
      sql` `,
    );
    const inClause = sql.join(ids.map((id) => sql`${id}`), sql`, `);

    await db.execute(
      sql`UPDATE World SET randomNumber = CASE id ${caseClause} END WHERE id IN (${inClause})`,
    );
  },
};
