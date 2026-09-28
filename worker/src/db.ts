import type { User } from "./env";

/** Auth records live in D1, not Sanity: the Sanity free plan is public-only. */

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    password_hash: String(row.password_hash),
    created_at: String(row.created_at),
  };
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE email = ?1")
    .bind(email)
    .first<Record<string, unknown>>();
  return row ? rowToUser(row) : null;
}

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ?1")
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? rowToUser(row) : null;
}

export async function createUser(
  db: D1Database,
  user: { id: string; email: string; name: string; password_hash: string; created_at: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(user.id, user.email, user.name, user.password_hash, user.created_at)
    .run();
}
