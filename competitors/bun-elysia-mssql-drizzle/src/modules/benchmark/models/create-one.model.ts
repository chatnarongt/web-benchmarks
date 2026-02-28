import { t } from 'elysia';

export const createOneBody = t.Object({
  randomNumber: t.Number({
    description: 'A random number between 1 and 10000',
    minimum: 1,
    maximum: 10000,
  }),
});

export type CreateOneBody = typeof createOneBody.static;
