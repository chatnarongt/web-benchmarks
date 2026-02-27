import { db } from '@utils/db';
import type { UpdateOneBody, UpdateOneParams, UpdateOneResponse } from '../models/update-one.model';

export const UpdateOneUseCase = {
  execute: async (params: UpdateOneParams, body: UpdateOneBody): Promise<UpdateOneResponse> => {
    const updatedRecord = await db.world.update({
      where: { id: params.id },
      data: { randomNumber: body.randomNumber },
    });
    return updatedRecord;
  },
};
