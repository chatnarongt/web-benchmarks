import { Elysia } from "elysia";
import { node } from '@elysiajs/node'
import postgres from "postgres";

const sql = postgres({
  host: "postgres-service",
  port: 5432,
  database: "benchmark",
  username: "postgres",
  password: "benchmark",
  max: 100,
  idle_timeout: 0,
});

new Elysia({ adapter: node() })
  .get("/plaintext", () => "Hello World!")
  .get("/json", () => ({ message: "Hello World!" }))
  .get("/database/single-read", async ({ query }) => {
    const id = +(query.id as string) || 1;
    const [world] = await sql`SELECT id, randomnumber AS "randomNumber" FROM World WHERE id = ${id}`;
    return world;
  })
  .get("/database/multiple-read", async ({ query }) => {
    const limit = +(query.limit as string) || 20;
    const offset = +(query.offset as string) || 0;
    return await sql`SELECT id, randomnumber AS "randomNumber" FROM World LIMIT ${limit} OFFSET ${offset}`;
  })
  .get("/database/single-write", async ({ query }) => {
    const id = +(query.id as string) || 1;
    const [world] = await sql`SELECT id, randomnumber AS "randomNumber" FROM World WHERE id = ${id}`;
    if (world) {
      const newRandomNumber = +(query.randomNumber as string) || 1;
      await sql`UPDATE World SET randomNumber = ${newRandomNumber} WHERE id = ${id}`;
      world.randomNumber = newRandomNumber;
    }
    return world;
  })
  .get("/database/multiple-write", async ({ query }) => {
    const limit = +(query.limit as string) || 20;
    const offset = +(query.offset as string) || 0;
    const rVals = (query.r as string || '').split(',').map(n => +n || 1);

    const worlds = await sql`SELECT id, randomnumber AS "randomNumber" FROM World LIMIT ${limit} OFFSET ${offset}`;

    if (worlds && worlds.length > 0) {
      const ids = new Array(worlds.length);
      const rns = new Array(worlds.length);
      for (let i = 0; i < worlds.length; i++) {
        ids[i] = worlds[i].id;
        rns[i] = rVals[i] || 1;
        worlds[i].randomNumber = rns[i];
      }
      await sql`UPDATE World SET randomnumber = u.rn FROM unnest(${ids}::int[], ${rns}::int[]) AS u(id, rn) WHERE World.id = u.id`;
    }

    return worlds;
  })
  .listen(3000, ({ hostname, port }) => {
    console.log(
      `🦊 Elysia is running at ${hostname}:${port}`
    );
  });
