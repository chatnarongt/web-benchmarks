import { db } from '@utils/db';
import type { ReadOneQuery, ReadOneResponse } from '../models/read-one.model';

export const GetReadOneUseCase = {
  async execute(query: ReadOneQuery): Promise<ReadOneResponse> {
    const result = await db.world.findFirstOrThrow({
      where: {
        id: query.id,
      },
    });
    return result;
  },
};
