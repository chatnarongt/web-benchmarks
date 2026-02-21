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
  .get("/database/single-read", async () => {
    const id = Math.floor(Math.random() * 10000) + 1;
    const [world] = await sql`SELECT * FROM World WHERE id = ${id}`;
    return world;
  })
  .get("/database/multiple-read", async () => {
    const limit = 20;
    const offset = Math.floor(Math.random() * (10000 - limit));
    return await sql`SELECT * FROM World LIMIT ${limit} OFFSET ${offset}`;
  })
  .listen(3000, ({ hostname, port }) => {
    console.log(
      `🦊 Elysia is running at ${hostname}:${port}`
    );
  });
