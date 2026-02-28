import { mssqlTable, int, primaryKey } from "drizzle-orm/mssql-core"
import { sql } from "drizzle-orm"


export const temp = mssqlTable("Temp", {
	id: int().identity({ seed: 1 ,increment: 1 }),
	randomNumber: int().notNull(),
}, (table) => [
	primaryKey({ columns: [table.id], name: "PK__Temp__3213E83F38F60023"}),
]);

export const world = mssqlTable("World", {
	id: int().identity({ seed: 1 ,increment: 1 }),
	randomNumber: int().notNull(),
}, (table) => [
	primaryKey({ columns: [table.id], name: "PK__World__3213E83FD26C5AB2"}),
]);
