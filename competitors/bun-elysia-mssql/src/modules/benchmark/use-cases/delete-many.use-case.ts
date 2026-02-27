import { db } from '@utils/db';
import type { DeleteManyBody } from '../models/delete-many.model';

export const DeleteManyUseCase = {
  execute: async (body: DeleteManyBody): Promise<void> => {
    await db.temp.deleteMany({
      where: { id: { in: body.ids } },
    });
  },
};
