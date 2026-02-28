import type { GetJsonResponse } from '../models/json.model';

export const GetJsonUseCase = {
  execute(): GetJsonResponse {
    return { message: 'Hello, World!' };
  },
};
