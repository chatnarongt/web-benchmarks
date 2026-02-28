import { db } from '@utils/db';
import type { DeleteOneParams } from '../models/delete-one.model';

export const DeleteOneUseCase = {
  execute: async (params: DeleteOneParams): Promise<void> => {
    // Use deleteMany (not delete) so that a missing row returns count=0
    // instead of throwing P2025 "Record to delete does not exist".
    await db.temp.deleteMany({
      where: { id: params.id },
    });
  },
};
