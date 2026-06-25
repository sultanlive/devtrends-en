import type { Env, TranslatedArticle } from "./types";

/** Locale code -> language name for translation prompts. */
export const LOCALE_LANG: Record<string, string> = {
  es: "Spanish",
  de: "German",
  zh: "Simplified Chinese",
  ja: "Japanese",
  fr: "French",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
};

const SYSTEM_PROMPT = `You are a professional technical translator. You translate developer-focused articles from Russian to natural, fluent English written for an English-speaking software audience.

STRICT RULES:
- Preserve ALL HTML tags, structure, and attributes (href, id, class, src, alt) EXACTLY. Do not add, remove, or reorder tags.
- NEVER translate or alter anything inside <code> or <pre> tags — code, shell commands, file paths, and identifiers must remain byte-for-byte identical.
- Keep product, library, tool, and brand names as-is (e.g. Rclone, Go, Docker, S3).
- Translate prose naturally; do not translate technical jargon into awkward calques.
- Do not invent content or add commentary.

OUTPUT: Return ONLY a single JSON object (no markdown fences) with exactly these keys:
  "title": the translated article title as plain text,
  "body_html": the translated article body as HTML (same structure as input),
  "excerpt": a 1-2 sentence English summary, plain text, ~160 characters,
  "meta_description": an SEO meta description, plain text, max 160 characters.`;

function stripFences(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  }
  return t;
}

/** One OpenAI-compatible Chat Completions call returning a parsed JSON object. */
async function callLlmJson(env: Env, system: string, user: string): Promise<Partial<TranslatedArticle>> {
  const endpoint = `${env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  try {
    return JSON.parse(stripFences(content));
  } catch {
    throw new Error("LLM did not return valid JSON");
  }
}

/**
 * Translate one article (Russian source -> English) via an OpenAI-compatible
 * endpoint. Provider is selected entirely by env (OPENAI_BASE_URL / OPENAI_MODEL
 * / OPENAI_API_KEY) — swapping providers needs no code change.
 */
export async function translateArticle(
  env: Env,
  title: string,
  bodyHtml: string
): Promise<TranslatedArticle> {
  const user =
    `Translate this article to English.\n\n` +
    `TITLE (Russian):\n${title}\n\n` +
    `BODY_HTML (Russian):\n${bodyHtml}`;
  const parsed = await callLlmJson(env, SYSTEM_PROMPT, user);
  if (!parsed.title || !parsed.body_html) throw new Error("LLM JSON missing title/body_html");
  return {
    title: parsed.title,
    body_html: parsed.body_html,
    excerpt: (parsed.excerpt ?? "").slice(0, 300),
    meta_description: (parsed.meta_description ?? parsed.excerpt ?? "").slice(0, 200),
  };
}

/** Translate the already-English article into a target locale (e.g. "de"). */
export async function translateToLocale(
  env: Env,
  locale: string,
  en: TranslatedArticle
): Promise<TranslatedArticle> {
  const langName = LOCALE_LANG[locale] ?? locale;
  const system =
    `You are a professional technical translator. Translate the developer article from English into ${langName}, ` +
    `written naturally for a ${langName}-speaking software audience.\n\n` +
    `STRICT RULES:\n` +
    `- Preserve ALL HTML tags, structure, and attributes EXACTLY.\n` +
    `- NEVER translate or alter anything inside <code> or <pre> tags.\n` +
    `- Keep product, library, tool, and brand names as-is.\n` +
    `- Do not invent content or add commentary.\n\n` +
    `OUTPUT: Return ONLY a JSON object with keys: "title", "body_html", "excerpt", "meta_description".`;
  const user =
    `TITLE (English):\n${en.title}\n\n` +
    `EXCERPT (English):\n${en.excerpt}\n\n` +
    `META (English):\n${en.meta_description}\n\n` +
    `BODY_HTML (English):\n${en.body_html}`;
  const parsed = await callLlmJson(env, system, user);
  if (!parsed.title || !parsed.body_html) throw new Error(`LLM ${locale} missing title/body_html`);
  return {
    title: parsed.title,
    body_html: parsed.body_html,
    excerpt: (parsed.excerpt ?? "").slice(0, 300),
    meta_description: (parsed.meta_description ?? parsed.excerpt ?? "").slice(0, 200),
  };
}
