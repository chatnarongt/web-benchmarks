import { db } from '@utils/db';
import type { CreateManyBody, CreateManyResponse } from '../models/create-many.model';

export const CreateManyUseCase = {
  execute: async (body: CreateManyBody): Promise<CreateManyResponse> => {
    const createdRecords = await db.$transaction(
      body.items.map((item) => db.temp.create({ data: item })),
    );
    return createdRecords;
  },
};
