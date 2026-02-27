import { t } from 'elysia';

export const getPlaintextResponse = t.Literal('Hello, World!');

export type GetPlaintextResponse = typeof getPlaintextResponse.static;
