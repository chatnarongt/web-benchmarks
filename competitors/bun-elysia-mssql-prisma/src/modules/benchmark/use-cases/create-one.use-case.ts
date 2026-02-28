import { db } from '@utils/db';
import type { CreateOneBody } from '../models/create-one.model';

export const CreateOneUseCase = {
  execute: async (body: CreateOneBody): Promise<void> => {
    await db.temp.create({
      data: {
        randomNumber: body.randomNumber,
      },
    });
  },
};
