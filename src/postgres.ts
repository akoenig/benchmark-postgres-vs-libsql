import postgres from "postgres";
import { duration } from "./utils";

const POSTGRES_DATABASE_URL = Bun.env.POSTGRES_DATABASE_URL;

if (!POSTGRES_DATABASE_URL) {
	console.warn("Please define the POSTGRES_DATABASE_URL environment variable.");

	process.exit(1);
}

const sql = postgres(POSTGRES_DATABASE_URL, {
	ssl: true,
});

//
// Creating tables
//
console.log("About to create the tables ...");

await sql`
  CREATE TABLE "user" (
    id TEXT PRIMARY KEY,
    username TEXT
  );
`;

await sql`
  CREATE TABLE "user_profile" (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES "user"(id),
    first_name TEXT,
    last_name TEXT
  );
`;

const seed = Array.from({ length: 1000 }).map(() => ({
	id: `${Bun.nanoseconds()}${Math.random()}`,
	username: `user${Bun.nanoseconds()}`,
	profile: {
		id: `${Bun.nanoseconds()}${Math.random()}`,
		firstName: `firstName${Bun.nanoseconds()}`,
		lastName: `lastName${Bun.nanoseconds()}`,
	},
}));

//
// Seeding the database
//
console.log("About to seed the database ...");

for (const user of seed) {
	await sql.begin(async (sql) => {
		await sql`INSERT INTO "user" VALUES (${user.id}, ${user.username});`;
		await sql`INSERT INTO "user_profile" VALUES (${user.profile.id}, ${user.id}, ${user.profile.firstName}, ${user.profile.lastName});`;
	});
}

//
// Measure ...
//
const queryCount = 250;
console.log(`About to measure the performance with ${queryCount} queries ...`);

const start = Bun.nanoseconds();

for (let i = 0; i < queryCount; i++) {
	await sql`SELECT u.username, p.first_name FROM "user" u JOIN "user_profile" as p ON u.id = p.user_id`;
}

const delta = (Bun.nanoseconds() - start) / 1000;

console.log(
	`took ${duration(delta)}, ${duration(delta / queryCount)} per query`,
);

await sql.end();
