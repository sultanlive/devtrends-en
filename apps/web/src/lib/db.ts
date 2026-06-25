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

export async function listArticles(
  db: D1Database,
  opts: { limit: number; offset: number; language?: string } = { limit: 24, offset: 0 }
): Promise<Article[]> {
  const where = opts.language ? "status = 'published' AND language = ?" : "status = 'published'";
  const binds: unknown[] = opts.language ? [opts.language] : [];
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLS} FROM articles WHERE ${where}
        ORDER BY COALESCE(source_lastmod, updated_at) DESC, id DESC
        LIMIT ? OFFSET ?`
    )
    .bind(...binds, opts.limit, opts.offset)
    .all<Article>();
  return results ?? [];
}

export async function countArticles(db: D1Database, language?: string): Promise<number> {
  const where = language ? "status = 'published' AND language = ?" : "status = 'published'";
  const binds = language ? [language] : [];
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles WHERE ${where}`)
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
