import type { APIContext } from "astro";
import { getEnv, canonical } from "../lib/site";

export async function GET(context: APIContext): Promise<Response> {
  const env = getEnv(context.locals);
  const body = `User-agent: *
Allow: /

Sitemap: ${canonical(env.SITE_URL, "/sitemap.xml")}
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
