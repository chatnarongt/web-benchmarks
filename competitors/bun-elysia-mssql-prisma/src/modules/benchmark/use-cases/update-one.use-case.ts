import { db } from '@utils/db';
import type { UpdateOneBody, UpdateOneParams } from '../models/update-one.model';

export const UpdateOneUseCase = {
  execute: async (params: UpdateOneParams, body: UpdateOneBody): Promise<void> => {
    await db.world.update({
      where: { id: params.id },
      data: { randomNumber: body.randomNumber },
    });
  },
};
