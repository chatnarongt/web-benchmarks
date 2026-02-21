import { Elysia } from "elysia";
import { node } from '@elysiajs/node'
import postgres from "postgres";

const sql = postgres({
  host: "postgres-service",
  port: 5432,
  database: "benchmark",
  username: "postgres",
  password: "benchmark",
});

new Elysia({ adapter: node() })
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
