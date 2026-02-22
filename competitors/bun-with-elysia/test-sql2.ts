import { SQL } from 'bun'; const sql = new SQL({ url: 'postgres://postgres:benchmark@localhost:5432/benchmark' }); console.log(await sql`SELECT id FROM World WHERE id = ${'1'}`);
