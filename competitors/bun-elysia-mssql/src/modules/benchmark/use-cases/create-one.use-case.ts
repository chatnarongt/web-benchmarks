import { db } from '@utils/db';
import type { CreateOneBody, CreateOneResponse } from '../models/create-one.model';

export const CreateOneUseCase = {
  execute: async (body: CreateOneBody): Promise<CreateOneResponse> => {
    const createdRecord = await db.temp.create({
      data: {
        randomNumber: body.randomNumber,
      },
    });
    return createdRecord;
  },
};
