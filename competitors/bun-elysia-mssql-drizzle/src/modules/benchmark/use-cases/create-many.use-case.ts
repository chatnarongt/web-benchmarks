import { temp } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import type { CreateManyBody } from '../models/create-many.model';

export const CreateManyUseCase = {
  execute: async (body: CreateManyBody): Promise<void> => {
    await db.insert(temp).values(body.items);
  },
};
