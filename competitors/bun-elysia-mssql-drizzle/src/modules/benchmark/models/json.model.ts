import { t } from 'elysia';

export const getJsonResponse = t.Object({
  message: t.Literal('Hello, World!'),
});

export type GetJsonResponse = typeof getJsonResponse.static;
