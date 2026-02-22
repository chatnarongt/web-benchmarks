import { Elysia } from "elysia";
import { SQL } from "bun";

const sql = new SQL({
  url: "postgres://postgres:benchmark@postgres-service:5432/benchmark",
  max: 100,
  idleTimeout: 0,
});

new Elysia()
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
      const values = worlds.map((w: any, index: number) => {
        w.randomNumber = rVals[index] || 1;
        return `(${w.id}, ${w.randomNumber})`;
      }).join(', ');

      await sql.unsafe(`UPDATE World SET randomnumber = u.rn FROM (VALUES ${values}) AS u(id, rn) WHERE World.id = u.id`);
    }

    return worlds;
  })
  .listen(3000, ({ hostname, port }) => {
    console.log(
      `🦊 Elysia is running at ${hostname}:${port}`
    );
  });
