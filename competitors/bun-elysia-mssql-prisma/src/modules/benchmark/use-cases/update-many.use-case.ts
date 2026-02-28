import { db } from '@utils/db';
import { Prisma } from '@generated/prisma/client';
import type { UpdateManyBody } from '../models/update-many.model';

export const UpdateManyUseCase = {
  execute: async (body: UpdateManyBody): Promise<void> => {
    const ids = body.items.map((item) => item.id);

    // Build a single UPDATE ... CASE WHEN ... statement — one query, one connection.
    const caseFragments = body.items
      .map((item) => Prisma.sql`WHEN ${item.id} THEN ${item.randomNumber}`)
      .reduce((acc, frag) => Prisma.sql`${acc} ${frag}`, Prisma.empty);

    const inList = ids
      .map((id) => Prisma.sql`${id}`)
      .reduce((acc, frag, i) => (i === 0 ? frag : Prisma.sql`${acc}, ${frag}`), Prisma.empty);

    await db.$executeRaw(
      Prisma.sql`UPDATE World SET randomNumber = CASE id ${caseFragments} END WHERE id IN (${inList})`,
    );
  },
};
