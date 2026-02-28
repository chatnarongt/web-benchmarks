import { db } from '@utils/db';
import type { DeleteOneParams } from '../models/delete-one.model';

export const DeleteOneUseCase = {
  execute: async (params: DeleteOneParams): Promise<void> => {
    await db.temp.delete({
      where: { id: params.id },
    });
  },
};
