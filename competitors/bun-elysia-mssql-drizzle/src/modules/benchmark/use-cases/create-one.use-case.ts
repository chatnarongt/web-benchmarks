import { temp } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import type { CreateOneBody } from '../models/create-one.model';

export const CreateOneUseCase = {
  execute: async (body: CreateOneBody): Promise<void> => {
    await db.insert(temp).values({
      randomNumber: body.randomNumber,
    });
  },
};
