import { world } from '@generated/drizzle/schema';
import { db } from '@utils/db';
import { eq } from 'drizzle-orm';
import type { ReadOneQuery, ReadOneResponse } from '../models/read-one.model';

export const GetReadOneUseCase = {
  async execute(query: ReadOneQuery): Promise<ReadOneResponse> {
    const result = await db.select().from(world).where(eq(world.id, query.id));
    return result[0];
  },
};
