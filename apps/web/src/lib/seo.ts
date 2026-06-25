// JSON-LD structured-data builders (schema.org).

type Ld = Record<string, unknown>;

export function websiteLd(site: string, name: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: site,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationLd(site: string, name: string, logo: string, sameAs: string[] = []): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: site,
    logo,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
