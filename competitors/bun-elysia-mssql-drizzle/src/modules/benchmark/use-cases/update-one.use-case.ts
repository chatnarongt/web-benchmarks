import { world } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import { eq } from 'drizzle-orm';
import type { UpdateOneBody, UpdateOneParams } from '../models/update-one.model';

export const UpdateOneUseCase = {
  execute: async (params: UpdateOneParams, body: UpdateOneBody): Promise<void> => {
    await db.update(world).set({ randomNumber: body.randomNumber }).where(eq(world.id, params.id));
  },
};
