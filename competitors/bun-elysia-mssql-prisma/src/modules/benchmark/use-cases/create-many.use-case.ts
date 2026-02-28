import { db } from '@utils/db';
import type { CreateManyBody } from '../models/create-many.model';

export const CreateManyUseCase = {
  execute: async (body: CreateManyBody): Promise<void> => {
    await db.temp.createMany({ data: body.items });
  },
};
