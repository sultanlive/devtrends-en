import type { APIContext } from "astro";
import { getEnv, canonical, articlePath } from "../lib/site";
import { allPublishedUrls, listLanguages } from "../lib/db";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(context: APIContext): Promise<Response> {
  const env = getEnv(context.locals);
  const [articles, languages] = await Promise.all([
    allPublishedUrls(env.DB),
    listLanguages(env.DB),
  ]);

  const urls: { loc: string; lastmod?: string | null }[] = [
    { loc: canonical(env.SITE_URL, "/") },
    ...languages.map((l) => ({ loc: canonical(env.SITE_URL, `/${l.language}`) })),
    ...articles.map((a) => ({
      loc: canonical(env.SITE_URL, articlePath(a.language, a.slug)),
      lastmod: a.source_lastmod ?? a.updated_at,
    })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${esc(new Date(u.lastmod).toISOString())}</lastmod>` : "") +
          `</url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
