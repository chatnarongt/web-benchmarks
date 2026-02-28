import Elysia, { t } from 'elysia';
import { createManyBody } from './models/create-many.model';
import { createOneBody } from './models/create-one.model';
import { deleteManyBody } from './models/delete-many.model';
import { deleteOneParams } from './models/delete-one.model';
import { getJsonResponse } from './models/json.model';
import { getPlaintextResponse } from './models/plaintext.model';
import { readManyQuery, readManyResponse } from './models/read-many.model';
import { readOneQuery, readOneResponse } from './models/read-one.model';
import { updateManyBody } from './models/update-many.model';
import { updateOneBody, updateOneParams } from './models/update-one.model';
import { CreateManyUseCase } from './use-cases/create-many.use-case';
import { CreateOneUseCase } from './use-cases/create-one.use-case';
import { DeleteManyUseCase } from './use-cases/delete-many.use-case';
import { DeleteOneUseCase } from './use-cases/delete-one.use-case';
import { GetJsonUseCase } from './use-cases/json-serialization.use-case';
import { GetPlaintextUseCase } from './use-cases/plaintext.use-case';
import { GetReadManyUseCase } from './use-cases/read-many.use-case';
import { GetReadOneUseCase } from './use-cases/read-one.use-case';
import { UpdateManyUseCase } from './use-cases/update-many.use-case';
import { UpdateOneUseCase } from './use-cases/update-one.use-case';

export const benchmarkController = new Elysia()
  .get(
    '/plaintext',
    () => {
      return GetPlaintextUseCase.execute();
    },
    {
      response: {
        200: getPlaintextResponse,
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for plaintext benchmark',
        description: 'Returns a simple plaintext response for benchmarking purposes.',
      },
    },
  )
  .get(
    '/json-serialization',
    () => {
      return GetJsonUseCase.execute();
    },
    {
      response: {
        200: getJsonResponse,
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for JSON serialization benchmark',
        description: 'Returns a JSON response to benchmark serialization performance.',
      },
    },
  )
  .get(
    '/read-one',
    async ({ query }) => {
      return GetReadOneUseCase.execute(query);
    },
    {
      query: readOneQuery,
      response: {
        200: readOneResponse,
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database read benchmark',
        description: 'Fetches a single record from the database based on the provided ID.',
      },
    },
  )
  .get(
    '/read-many',
    async ({ query }) => {
      return GetReadManyUseCase.execute(query);
    },
    {
      query: readManyQuery,
      response: {
        200: readManyResponse,
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database read benchmark (multiple records)',
        description: 'Fetches multiple records from the database based on pagination parameters.',
      },
    },
  )
  .post(
    '/create-one',
    async ({ body, set }) => {
      await CreateOneUseCase.execute(body);
      set.status = 201;
    },
    {
      body: createOneBody,
      response: {
        201: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database create benchmark',
        description: 'Creates a new record in the database with the provided random number.',
      },
    },
  )
  .post(
    '/create-many',
    async ({ body, set }) => {
      await CreateManyUseCase.execute(body);
      set.status = 201;
    },
    {
      body: createManyBody,
      response: {
        201: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database create benchmark (multiple records)',
        description:
          'Creates multiple new records in the database with the provided random numbers.',
      },
    },
  )
  .patch(
    '/update-one/:id',
    async ({ params, body }) => {
      await UpdateOneUseCase.execute(params, body);
    },
    {
      params: updateOneParams,
      body: updateOneBody,
      response: {
        200: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database update benchmark',
        description: 'Updates a single World record by ID with the provided random number.',
      },
    },
  )
  .put(
    '/update-many',
    async ({ body }) => {
      await UpdateManyUseCase.execute(body);
    },
    {
      body: updateManyBody,
      response: {
        200: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database update benchmark (multiple records)',
        description: 'Updates multiple World records by ID with the provided random numbers.',
      },
    },
  )
  .delete(
    '/delete-one/:id',
    async ({ params, set }) => {
      await DeleteOneUseCase.execute(params);
      set.status = 204;
    },
    {
      params: deleteOneParams,
      response: {
        204: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database delete benchmark',
        description: 'Deletes a single Temp record by ID.',
      },
    },
  )
  .delete(
    '/delete-many',
    async ({ body, set }) => {
      await DeleteManyUseCase.execute(body);
      set.status = 204;
    },
    {
      body: deleteManyBody,
      response: {
        204: t.Void(),
      },
      detail: {
        tags: ['Benchmark'],
        summary: 'Endpoint for database delete benchmark (multiple records)',
        description: 'Deletes multiple Temp records by their IDs.',
      },
    },
  );
