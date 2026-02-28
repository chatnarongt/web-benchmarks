import { temp } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import { eq } from 'drizzle-orm';
import type { DeleteOneParams } from '../models/delete-one.model';

export const DeleteOneUseCase = {
  execute: async (params: DeleteOneParams): Promise<void> => {
    await db.delete(temp).where(eq(temp.id, params.id));
  },
};
