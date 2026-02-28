import { db } from '@utils/db';
import type { UpdateManyBody, UpdateManyResponse } from '../models/update-many.model';

export const UpdateManyUseCase = {
  execute: async (body: UpdateManyBody): Promise<UpdateManyResponse> => {
    const updatedRecords = await db.$transaction(
      body.items.map((item) =>
        db.world.update({
          where: { id: item.id },
          data: { randomNumber: item.randomNumber },
        }),
      ),
    );
    return { items: updatedRecords };
  },
};
