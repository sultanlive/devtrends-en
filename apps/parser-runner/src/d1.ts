// Minimal D1 HTTP client that mimics the subset of the Workers D1 binding API
// the parser modules use (prepare/bind/run/all/first + batch), so they run
// unchanged off-Cloudflare. Uses the Cloudflare REST API with the same
// CLOUDFLARE_API_TOKEN already used for deploys (no new secrets).

const API = "https://api.cloudflare.com/client/v4";

interface D1Meta {
  changes?: number;
  last_row_id?: number;
}

async function query(sql: string, params: unknown[]): Promise<{ results: any[]; meta: D1Meta }> {
  const acct = required("CLOUDFLARE_ACCOUNT_ID");
  const db = required("D1_DATABASE_ID");
  const token = required("CLOUDFLARE_API_TOKEN");
  const res = await fetch(`${API}/accounts/${acct}/d1/database/${db}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(`D1 ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  }
  const r = json.result?.[0] ?? {};
  return { results: r.results ?? [], meta: r.meta ?? {} };
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

class Stmt {
  constructor(private sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]): Stmt {
    return new Stmt(this.sql, params);
  }
  async run(): Promise<{ success: true; meta: D1Meta }> {
    const r = await query(this.sql, this.params);
    return { success: true, meta: r.meta };
  }
  async all<T = any>(): Promise<{ results: T[]; success: true; meta: D1Meta }> {
    const r = await query(this.sql, this.params);
    return { results: r.results as T[], success: true, meta: r.meta };
  }
  async first<T = any>(): Promise<T | null> {
    const r = await query(this.sql, this.params);
    return (r.results[0] ?? null) as T | null;
  }
}

/** Stand-in for `env.DB` (D1Database). Cast to `any` when assigning to Env. */
export class D1Rest {
  prepare(sql: string): Stmt {
    return new Stmt(sql);
  }
  /** No real transaction over HTTP — runs statements sequentially. Our writes
   *  are idempotent (INSERT OR IGNORE / upserts), so this is safe. */
  async batch(stmts: Stmt[]): Promise<Array<{ success: true; meta: D1Meta }>> {
    const out = [];
    for (const s of stmts) out.push(await s.run());
    return out;
  }
}
