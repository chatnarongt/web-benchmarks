import { db } from '@utils/db';
import type { ReadManyQuery, ReadManyResponse } from '../models/read-many.model';

export const GetReadManyUseCase = {
  async execute(query: ReadManyQuery): Promise<ReadManyResponse> {
    const results = await db.world.findMany({
      skip: query.offset,
      take: query.limit,
    });
    return results;
  },
};
