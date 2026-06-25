export interface Article {
  id: number;
  language: string;
  slug: string;
  title_en: string;
  excerpt_en: string | null;
  body_html_en: string | null;
  meta_description: string | null;
  og_image: string | null;
  tags: string | null; // JSON array string
  github_stars: number | null;
  source_url: string;
  source_date: string | null;
  source_lastmod: string | null;
  updated_at: string | null;
}

export interface LanguageCount {
  language: string;
  n: number;
}

// Localized list columns: title/excerpt fall back to English via the translation
// LEFT JOIN (no row for the locale -> COALESCE returns the English column).
const SEL_LIST = `
  a.id, a.language, a.slug,
  COALESCE(t.title, a.title_en) AS title_en,
  COALESCE(t.excerpt, a.excerpt_en) AS excerpt_en,
  a.og_image, a.tags, a.github_stars, a.source_date, a.source_lastmod, a.updated_at`;

const JOIN = "LEFT JOIN article_translations t ON t.article_id = a.id AND t.locale = ?";

export function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function buildWhere(language?: string, q?: string): { sql: string; binds: unknown[] } {
  const clauses = ["a.status = 'published'"];
  const binds: unknown[] = [];
  if (language) {
    clauses.push("a.language = ?");
    binds.push(language);
  }
  if (q && q.trim()) {
    clauses.push("(a.title_en LIKE ? OR a.excerpt_en LIKE ? OR a.tags LIKE ?)");
    const like = `%${q.trim()}%`;
    binds.push(like, like, like);
  }
  return { sql: clauses.join(" AND "), binds };
}

export async function listArticles(
  db: D1Database,
  opts: { limit: number; offset: number; language?: string; q?: string; locale?: string } = {
    limit: 24,
    offset: 0,
  }
): Promise<Article[]> {
  const { sql, binds } = buildWhere(opts.language, opts.q);
  const { results } = await db
    .prepare(
      `SELECT ${SEL_LIST} FROM articles a ${JOIN} WHERE ${sql}
        ORDER BY COALESCE(a.source_lastmod, a.updated_at) DESC, a.id DESC
        LIMIT ? OFFSET ?`
    )
    .bind(opts.locale ?? "en", ...binds, opts.limit, opts.offset)
    .all<Article>();
  return results ?? [];
}

export async function countArticles(db: D1Database, language?: string, q?: string): Promise<number> {
  const { sql, binds } = buildWhere(language, q);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles a WHERE ${sql}`)
    .bind(...binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getArticle(
  db: D1Database,
  language: string,
  slug: string,
  locale = "en"
): Promise<Article | null> {
  return await db
    .prepare(
      `SELECT
         a.id, a.language, a.slug, a.source_url, a.og_image, a.tags,
         a.github_stars, a.source_date, a.source_lastmod, a.updated_at,
         COALESCE(t.title, a.title_en) AS title_en,
         COALESCE(t.excerpt, a.excerpt_en) AS excerpt_en,
         COALESCE(t.body_html, a.body_html_en) AS body_html_en,
         COALESCE(t.meta_description, a.meta_description) AS meta_description
       FROM articles a ${JOIN}
       WHERE a.status = 'published' AND a.language = ? AND a.slug = ? LIMIT 1`
    )
    .bind(locale, language, slug)
    .first<Article>();
}

export async function listByTag(
  db: D1Database,
  tag: string,
  opts: { limit: number; offset: number; locale?: string } = { limit: 24, offset: 0 }
): Promise<Article[]> {
  const needle = `%"${escapeLike(tag)}"%`;
  const { results } = await db
    .prepare(
      `SELECT ${SEL_LIST} FROM articles a ${JOIN}
        WHERE a.status = 'published' AND a.tags LIKE ? ESCAPE '\\'
        ORDER BY COALESCE(a.source_lastmod, a.updated_at) DESC, a.id DESC
        LIMIT ? OFFSET ?`
    )
    .bind(opts.locale ?? "en", needle, opts.limit, opts.offset)
    .all<Article>();
  return results ?? [];
}

export async function countByTag(db: D1Database, tag: string): Promise<number> {
  const needle = `%"${escapeLike(tag)}"%`;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles a WHERE a.status = 'published' AND a.tags LIKE ? ESCAPE '\\'`)
    .bind(needle)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Related projects: same language or any shared tag, excluding the current one. */
export async function relatedArticles(
  db: D1Database,
  article: { id: number; language: string; tags: string[] },
  limit = 6,
  locale = "en"
): Promise<Article[]> {
  const tagClauses = article.tags.map(() => "a.tags LIKE ? ESCAPE '\\'");
  const cond = ["a.language = ?", ...tagClauses].join(" OR ");
  const tagBinds = article.tags.map((tg) => `%"${escapeLike(tg)}"%`);
  const { results } = await db
    .prepare(
      `SELECT ${SEL_LIST} FROM articles a ${JOIN}
        WHERE a.status = 'published' AND a.id != ? AND (${cond})
        ORDER BY COALESCE(a.source_lastmod, a.updated_at) DESC, a.id DESC
        LIMIT ?`
    )
    .bind(locale, article.id, article.language, ...tagBinds, limit)
    .all<Article>();
  return results ?? [];
}

function tagOrClause(tags: string[]): { sql: string; binds: string[] } {
  const sql = tags.map(() => "a.tags LIKE ? ESCAPE '\\'").join(" OR ");
  const binds = tags.map((t) => `%"${escapeLike(t)}"%`);
  return { sql: `(${sql})`, binds };
}

export async function listBySection(
  db: D1Database,
  tags: string[],
  opts: { limit: number; offset: number; locale?: string } = { limit: 24, offset: 0 }
): Promise<Article[]> {
  if (tags.length === 0) return [];
  const { sql, binds } = tagOrClause(tags);
  const { results } = await db
    .prepare(
      `SELECT ${SEL_LIST} FROM articles a ${JOIN}
        WHERE a.status = 'published' AND ${sql}
        ORDER BY COALESCE(a.source_lastmod, a.updated_at) DESC, a.id DESC
        LIMIT ? OFFSET ?`
    )
    .bind(opts.locale ?? "en", ...binds, opts.limit, opts.offset)
    .all<Article>();
  return results ?? [];
}

export async function countBySection(db: D1Database, tags: string[]): Promise<number> {
  if (tags.length === 0) return 0;
  const { sql, binds } = tagOrClause(tags);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles a WHERE a.status = 'published' AND ${sql}`)
    .bind(...binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function listLanguages(db: D1Database): Promise<LanguageCount[]> {
  const { results } = await db
    .prepare(
      `SELECT language, COUNT(*) AS n FROM articles
        WHERE status = 'published' AND language IS NOT NULL
        GROUP BY language ORDER BY n DESC, language ASC`
    )
    .all<LanguageCount>();
  return results ?? [];
}

/** Parsed tag arrays for every published article — for computing section counts in one query. */
export async function publishedTagSets(db: D1Database): Promise<string[][]> {
  const { results } = await db
    .prepare("SELECT tags FROM articles WHERE status = 'published' AND tags IS NOT NULL")
    .all<{ tags: string }>();
  return (results ?? []).map((r) => parseTags(r.tags));
}

export async function allTags(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT tags FROM articles WHERE status = 'published' AND tags IS NOT NULL")
    .all<{ tags: string }>();
  const set = new Set<string>();
  for (const r of results ?? []) for (const t of parseTags(r.tags)) set.add(t);
  return [...set].sort();
}

export async function allPublishedUrls(
  db: D1Database
): Promise<{ language: string; slug: string; updated_at: string | null; source_lastmod: string | null }[]> {
  const { results } = await db
    .prepare(
      `SELECT language, slug, updated_at, source_lastmod FROM articles
        WHERE status = 'published' AND language IS NOT NULL AND slug IS NOT NULL
        ORDER BY COALESCE(source_lastmod, updated_at) DESC`
    )
    .all<{ language: string; slug: string; updated_at: string | null; source_lastmod: string | null }>();
  return results ?? [];
}
