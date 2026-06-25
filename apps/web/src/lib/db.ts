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

const LIST_COLS =
  "id, language, slug, title_en, excerpt_en, og_image, tags, github_stars, source_date, source_lastmod, updated_at";

export function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function buildWhere(language?: string, q?: string): { sql: string; binds: unknown[] } {
  const clauses = ["status = 'published'"];
  const binds: unknown[] = [];
  if (language) {
    clauses.push("language = ?");
    binds.push(language);
  }
  if (q && q.trim()) {
    clauses.push("(title_en LIKE ? OR excerpt_en LIKE ? OR tags LIKE ?)");
    const like = `%${q.trim()}%`;
    binds.push(like, like, like);
  }
  return { sql: clauses.join(" AND "), binds };
}

export async function listArticles(
  db: D1Database,
  opts: { limit: number; offset: number; language?: string; q?: string } = { limit: 24, offset: 0 }
): Promise<Article[]> {
  const { sql, binds } = buildWhere(opts.language, opts.q);
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLS} FROM articles WHERE ${sql}
        ORDER BY COALESCE(source_lastmod, updated_at) DESC, id DESC
        LIMIT ? OFFSET ?`
    )
    .bind(...binds, opts.limit, opts.offset)
    .all<Article>();
  return results ?? [];
}

export async function countArticles(db: D1Database, language?: string, q?: string): Promise<number> {
  const { sql, binds } = buildWhere(language, q);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles WHERE ${sql}`)
    .bind(...binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getArticle(
  db: D1Database,
  language: string,
  slug: string
): Promise<Article | null> {
  return await db
    .prepare(
      "SELECT * FROM articles WHERE status = 'published' AND language = ? AND slug = ? LIMIT 1"
    )
    .bind(language, slug)
    .first<Article>();
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
