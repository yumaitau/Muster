import type { AuthAdapter } from "@muster/core";
import { betterAuth } from "better-auth";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const database = new Kysely({
  dialect: new PostgresDialect({ pool })
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: {
    db: database,
    type: "postgres"
  },
  emailAndPassword: {
    enabled: true
  }
});

export function createBetterAuthAdapter(): AuthAdapter {
  return {
    async getCurrentUser(headers) {
      const session = await auth.api.getSession({ headers });
      if (!session?.user) {
        return null;
      }
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      };
    },
    async signOut(headers) {
      await auth.api.signOut({ headers });
    }
  };
}
