import { world } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import type { ReadManyQuery, ReadManyResponse } from '../models/read-many.model';

export const GetReadManyUseCase = {
  async execute(query: ReadManyQuery): Promise<ReadManyResponse> {
    const { offset = 0, limit = 20 } = query;
    const results = await db.select().from(world).orderBy(world.id).offset(offset).fetch(limit);
    return results;
  },
};
