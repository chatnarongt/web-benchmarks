import { temp } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import { inArray } from 'drizzle-orm';
import type { DeleteManyBody } from '../models/delete-many.model';

export const DeleteManyUseCase = {
  execute: async (body: DeleteManyBody): Promise<void> => {
    await db.delete(temp).where(inArray(temp.id, body.ids));
  },
};
