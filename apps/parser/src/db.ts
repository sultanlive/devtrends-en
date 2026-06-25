import type { Env, ArticleRow, ScrapedArticle, TranslatedArticle } from "./types";

/** Derive `{language}` / `{slug}` from a source URL like /go/rclone-rclone. */
export function parseSourceUrl(
  url: string,
  sourceBase: string
): { language: string; rawSlug: string } | null {
  try {
    const u = new URL(url);
    const base = new URL(sourceBase);
    if (u.host !== base.host) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null; // only /{language}/{slug} article pages
    return { language: parts[0], rawSlug: parts[1] };
  } catch {
    return null;
  }
}

/** Clean, URL-safe slug. Source slugs are already ascii (e.g. rclone-rclone). */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Insert a discovered URL as pending if new, or bump source_lastmod (and
 * re-queue) if the source was updated since we last saw it. Returns true if a
 * row was inserted or re-queued.
 */
export async function upsertDiscovered(
  env: Env,
  source_url: string,
  source_lastmod: string | null,
  language: string,
  rawSlug: string
): Promise<boolean> {
  const existing = await env.DB.prepare(
    "SELECT id, source_lastmod, status FROM articles WHERE source_url = ?"
  )
    .bind(source_url)
    .first<{ id: number; source_lastmod: string | null; status: string }>();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO articles (source_url, source_lastmod, language, slug, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
      .bind(source_url, source_lastmod, language, toSlug(rawSlug))
      .run();
    return true;
  }

  // Re-queue if the source changed since we processed it.
  if (
    source_lastmod &&
    existing.source_lastmod &&
    source_lastmod > existing.source_lastmod &&
    existing.status === "published"
  ) {
    await env.DB.prepare(
      "UPDATE articles SET source_lastmod = ?, status = 'pending', updated_at = datetime('now') WHERE id = ?"
    )
      .bind(source_lastmod, existing.id)
      .run();
    return true;
  }
  return false;
}

/** Claim the next batch of pending articles (oldest first), marking them processing. */
export async function claimPending(env: Env, limit: number): Promise<ArticleRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, source_url, source_lastmod, language, slug, status, attempts
       FROM articles
      WHERE status = 'pending'
      ORDER BY source_lastmod DESC, id ASC
      LIMIT ?`
  )
    .bind(limit)
    .all<ArticleRow>();

  const rows = results ?? [];
  for (const r of rows) {
    await env.DB.prepare(
      "UPDATE articles SET status = 'processing', attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(r.id)
      .run();
  }
  return rows;
}

export async function markPublished(
  env: Env,
  row: ArticleRow,
  scraped: ScrapedArticle,
  translated: TranslatedArticle,
  ogImage: string | null
): Promise<void> {
  await env.DB.prepare(
    `UPDATE articles SET
        title_en = ?, excerpt_en = ?, body_html_en = ?, meta_description = ?,
        og_image = ?, tags = ?, github_stars = ?, source_date = ?,
        status = 'published', error = NULL, updated_at = datetime('now')
      WHERE id = ?`
  )
    .bind(
      translated.title,
      translated.excerpt,
      translated.body_html,
      translated.meta_description,
      ogImage,
      JSON.stringify(scraped.tags ?? []),
      scraped.githubStars,
      scraped.sourceDate,
      row.id
    )
    .run();
}

export async function markFailed(env: Env, id: number, error: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE articles SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(error.slice(0, 1000), id)
    .run();
}

export async function logRun(
  env: Env,
  discovered: number,
  processed: number,
  failed: number,
  note?: string
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO parse_log (discovered, processed, failed, note) VALUES (?, ?, ?, ?)"
  )
    .bind(discovered, processed, failed, note ?? null)
    .run();
}
