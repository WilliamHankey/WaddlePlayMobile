export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  SANITY_TOKEN: string;
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_API_VERSION: string;
  JWT_EXP_MINUTES: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}
