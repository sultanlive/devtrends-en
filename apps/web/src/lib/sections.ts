// Specialty sections (like devtrends.ru/sections/*). We have no "section" column,
// so a section is a curated set of tags; an article belongs to it if any of its
// tags match. Each section has its own accent color (distinct from the
// GitHub language colors used elsewhere).
export interface Section {
  slug: string;
  title: string;
  description: string;
  color: string;
  tags: string[];
}

export const SECTIONS: Section[] = [
  {
    slug: "frontend",
    title: "Frontend",
    description: "UI frameworks, build tools, and everything that runs in the browser — React, Vue, Svelte, bundlers, and dev servers.",
    color: "#38BDF8",
    tags: ["frontend", "spa", "browser", "bundler", "dev-server", "build-tool", "compiler", "reactive", "css", "html", "framework"],
  },
  {
    slug: "backend",
    title: "Backend",
    description: "Server frameworks, REST and GraphQL APIs, databases, caching, and the infrastructure behind your app.",
    color: "#34D399",
    tags: ["backend", "api", "http", "web-framework", "wsgi", "database", "cache", "in-memory", "networking", "server", "mvc", "enterprise", "fullstack", "orm"],
  },
  {
    slug: "mobile",
    title: "Mobile",
    description: "iOS and Android development — native SDKs, cross-platform toolkits, and mobile-first libraries.",
    color: "#FB7185",
    tags: ["mobile", "android", "ios", "react-native", "flutter"],
  },
  {
    slug: "devops",
    title: "DevOps",
    description: "Containers, orchestration, CI/CD, infrastructure as code, and observability for shipping and running software.",
    color: "#F59E0B",
    tags: ["devops", "iac", "cloud", "automation", "monitoring", "observability", "dashboards", "metrics", "containers", "docker", "kubernetes", "ci-cd"],
  },
  {
    slug: "ai-ml",
    title: "AI / ML",
    description: "Machine learning frameworks, data tooling, and the libraries powering modern AI applications.",
    color: "#A78BFA",
    tags: ["ai", "machine-learning", "nlp", "transformers", "ml", "data", "dataframe", "analytics", "computer-vision"],
  },
  {
    slug: "gamedev",
    title: "GameDev",
    description: "Game engines, graphics, physics, and asset tooling for building 2D and 3D games.",
    color: "#F472B6",
    tags: ["game", "gamedev", "graphics", "engine", "shaders", "physics"],
  },
  {
    slug: "blockchain",
    title: "Blockchain",
    description: "Smart contracts, Web3 libraries, DeFi, and decentralized application tooling.",
    color: "#FBBF24",
    tags: ["blockchain", "solidity", "web3", "crypto", "defi", "nft", "dapp"],
  },
  {
    slug: "embedded",
    title: "Embedded",
    description: "Microcontrollers, IoT, drivers, and real-time systems close to the metal.",
    color: "#2DD4BF",
    tags: ["embedded", "iot", "rtos", "microcontroller", "firmware", "drivers"],
  },
  {
    slug: "security",
    title: "Security",
    description: "Penetration testing, cryptography, network security, and tooling for defenders and researchers.",
    color: "#F87171",
    tags: ["security", "cryptography", "pentest", "forensics", "malware", "infosec"],
  },
];

export function getSection(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug?.toLowerCase());
}

/** Does a parsed tag list belong to a section? */
export function tagsMatchSection(tags: string[], section: Section): boolean {
  const set = new Set(tags.map((t) => t.toLowerCase()));
  return section.tags.some((t) => set.has(t));
}
