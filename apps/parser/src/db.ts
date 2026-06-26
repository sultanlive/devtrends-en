import type { Env, ArticleRow, ScrapedArticle, TranslatedArticle } from "./types";

/** Write all per-locale translations for an article in a single D1 batch
 *  (one subrequest instead of one per locale). */
export async function saveTranslationsBatch(
  env: Env,
  articleId: number,
  items: { locale: string; tr: TranslatedArticle }[]
): Promise<void> {
  if (items.length === 0) return;
  const stmts = items.map(({ locale, tr }) =>
    env.DB.prepare(
      `INSERT INTO article_translations (article_id, locale, title, excerpt, body_html, meta_description, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(article_id, locale) DO UPDATE SET
         title = excluded.title, excerpt = excluded.excerpt,
         body_html = excluded.body_html, meta_description = excluded.meta_description,
         updated_at = datetime('now')`
    ).bind(articleId, locale, tr.title, tr.excerpt, tr.body_html, tr.meta_description)
  );
  await env.DB.batch(stmts);
}

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

export interface DiscoveredItem {
  source_url: string;
  source_lastmod: string | null;
  language: string;
  slug: string;
}

/**
 * Bulk-enqueue discovered URLs as pending using batched INSERT OR IGNORE.
 * Dedup is handled by the source_url / (language, slug) UNIQUE constraints, so
 * no per-row SELECT is needed. Each db.batch() is a single subrequest, which
 * keeps the whole-sitemap sweep well within per-invocation limits. Returns the
 * number of newly inserted rows.
 *
 * Note: this only inserts NEW URLs; it does not re-queue an already-published
 * article when its source changes (handled separately if needed).
 */
export async function bulkInsertDiscovered(env: Env, items: DiscoveredItem[]): Promise<number> {
  const CHUNK = 200; // statements per batch (one db.batch() = one subrequest)
  let inserted = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const stmts = items.slice(i, i + CHUNK).map((it) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO articles (source_url, source_lastmod, language, slug, status)
         VALUES (?, ?, ?, ?, 'pending')`
      ).bind(it.source_url, it.source_lastmod, it.language, it.slug)
    );
    const results = await env.DB.batch(stmts);
    for (const r of results) inserted += r.meta?.changes ?? 0;
  }
  return inserted;
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
  // Re-queue transient failures (e.g. a slow/timed-out LLM call) so they retry;
  // give up after 5 attempts. `attempts` is incremented by claimPending.
  await env.DB.prepare(
    "UPDATE articles SET status = CASE WHEN attempts < 5 THEN 'pending' ELSE 'failed' END, error = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(error.slice(0, 1000), id)
    .run();
}

/**
 * Newest published articles that don't yet have ALL target locales, each with
 * the list of locales still missing and the English source to translate from.
 * Used to backfill locales newest-article-first (so recent posts get fully
 * localized before older ones). Resumable: a timed-out run just retries.
 */
export async function getArticlesNeedingLocales(
  env: Env,
  targetLocales: string[],
  limitArticles: number
): Promise<{ id: number; slug: string | null; language: string | null; en: TranslatedArticle; missing: string[] }[]> {
  if (targetLocales.length === 0) return [];
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.slug, a.language, a.title_en, a.excerpt_en, a.body_html_en, a.meta_description
       FROM articles a
      WHERE a.status = 'published' AND a.title_en IS NOT NULL
        AND (SELECT count(*) FROM article_translations t WHERE t.article_id = a.id) < ?
      ORDER BY a.updated_at DESC
      LIMIT ?`
  )
    .bind(targetLocales.length, limitArticles)
    .all<{
      id: number; slug: string | null; language: string | null;
      title_en: string | null; excerpt_en: string | null;
      body_html_en: string | null; meta_description: string | null;
    }>();

  const out = [];
  for (const r of results ?? []) {
    const pres = await env.DB.prepare(
      "SELECT locale FROM article_translations WHERE article_id = ?"
    )
      .bind(r.id)
      .all<{ locale: string }>();
    const present = new Set((pres.results ?? []).map((x) => x.locale));
    const missing = targetLocales.filter((l) => !present.has(l));
    out.push({
      id: r.id,
      slug: r.slug,
      language: r.language,
      missing,
      en: {
        title: r.title_en ?? "",
        body_html: r.body_html_en ?? "",
        excerpt: r.excerpt_en ?? "",
        meta_description: r.meta_description ?? "",
      },
    });
  }
  return out;
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
