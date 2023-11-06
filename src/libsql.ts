/**
 * libSQL read performance benchmark.
 *
 * @author André König <hi@andrekoenig.de>
 *
 */

import { createClient } from "@libsql/client";

import { duration } from "./utils";

const syncUrl = Bun.env.LIBSQL_DATABASE_URL;
const authToken = Bun.env.LIBSQL_AUTH_TOKEN;

if (!syncUrl) {
	console.warn("Please define the LIBSQL_DATABASE_URL environment variable.");

	process.exit(1);
}

if (!authToken) {
	console.warn("Please define the LIBSQL_AUTH_TOKEN environment variable.");

	process.exit(1);
}

const database = createClient({
	url: `file://${process.cwd()}/libsql.db`,
	syncUrl,
	authToken,
});

//
// Creating tables
//
console.log("About to create the tables ...");

await database.execute(`
  CREATE TABLE "user" (
    id TEXT PRIMARY KEY,
    username TEXT
  );
`);

await database.execute(`
  CREATE TABLE "user_profile" (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES "user"(id),
    first_name TEXT,
    last_name TEXT
  );
`);

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
	await database.execute({
		sql: `INSERT INTO "user" VALUES (?, ?)`,
		args: [user.id, user.username],
	});

	await database.execute({
		sql: `INSERT INTO "user_profile" VALUES (?, ?, ?, ?)`,
		args: [
			user.profile.id,
			user.id,
			user.profile.firstName,
			user.profile.lastName,
		],
	});
}

console.log("About to sync to local replica.");

await database.sync();

await new Promise((resolve) => setTimeout(resolve, 1000));

//
// Measure ...
//
const queryCount = 250;
console.log(`About to measure the performance with ${queryCount} queries ...`);

const start = Bun.nanoseconds();

for (let i = 0; i < queryCount; i++) {
	await database.execute(
		"SELECT u.username, p.first_name FROM user u JOIN user_profile as p ON u.id = p.user_id",
	);
}

const delta = (Bun.nanoseconds() - start) / 1000;

console.log(
	`took ${duration(delta)}, ${duration(delta / queryCount)} per query`,
);

await database.close();
