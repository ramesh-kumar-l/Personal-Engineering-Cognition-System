import type { Memory } from '../storage/schema';
import type { TechnologyEntry } from '../storage/schema';

export type DetectedTechnology = {
  name: string;
  category: TechnologyEntry['category'];
  tags: string[];
};

// Known technology registry — name (lowercase key) → category
const TECH_REGISTRY: Record<string, TechnologyEntry['category']> = {
  // Languages
  typescript: 'language', javascript: 'language', python: 'language',
  go: 'language', rust: 'language', java: 'language', kotlin: 'language',
  swift: 'language', ruby: 'language', 'c#': 'language', cpp: 'language',
  php: 'language', scala: 'language', elixir: 'language', haskell: 'language',
  // Frameworks / libraries
  react: 'framework', vue: 'framework', angular: 'framework', svelte: 'framework',
  nextjs: 'framework', nuxt: 'framework', express: 'framework', fastapi: 'framework',
  django: 'framework', flask: 'framework', rails: 'framework', spring: 'framework',
  nestjs: 'framework', koa: 'framework', hono: 'framework', elysia: 'framework',
  // Tools
  docker: 'tool', kubernetes: 'tool', terraform: 'tool', ansible: 'tool',
  webpack: 'tool', vite: 'tool', esbuild: 'tool', rollup: 'tool',
  jest: 'tool', vitest: 'tool', pytest: 'tool', mocha: 'tool',
  eslint: 'tool', prettier: 'tool', git: 'tool', github: 'tool',
  gitlab: 'tool', graphql: 'tool', grpc: 'tool', openapi: 'tool',
  // Platforms / cloud
  aws: 'platform', gcp: 'platform', azure: 'platform', vercel: 'platform',
  netlify: 'platform', cloudflare: 'platform', heroku: 'platform', fly: 'platform',
  // Services / databases
  postgresql: 'service', mysql: 'service', mongodb: 'service', redis: 'service',
  sqlite: 'service', kafka: 'service', rabbitmq: 'service', elasticsearch: 'service',
  supabase: 'service', planetscale: 'service', neon: 'service',
  // Patterns
  rest: 'pattern', graphql_api: 'pattern', microservices: 'pattern',
  monorepo: 'pattern', 'event-driven': 'pattern', 'domain-driven': 'pattern',
  tdd: 'pattern', bdd: 'pattern', ddd: 'pattern', cqrs: 'pattern',
};

// Build a regex that matches whole words from the registry keys
const TECH_NAMES = Object.keys(TECH_REGISTRY);
// Sort longest-first so "next.js" matches before "js"
const sortedNames = TECH_NAMES.sort((a, b) => b.length - a.length);
const TECH_REGEX = new RegExp(
  `\\b(${sortedNames.map(escapeRegex).join('|')})\\b`,
  'gi',
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class TechnologyTracker {
  /**
   * Scan a block of text and return detected technologies.
   * Deduplicates by name (case-insensitive).
   */
  static detectFromText(text: string, contextTags: string[] = []): DetectedTechnology[] {
    const seen = new Map<string, DetectedTechnology>();
    const matches = text.matchAll(TECH_REGEX);
    for (const match of matches) {
      const raw = match[1];
      const key = raw.toLowerCase();
      if (!seen.has(key)) {
        const canonical = canonicalize(key);
        seen.set(key, {
          name: canonical,
          category: TECH_REGISTRY[key] ?? 'tool',
          tags: [...contextTags],
        });
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Extract technologies from a set of memories.
   */
  static detectFromMemories(memories: Memory[]): DetectedTechnology[] {
    const seen = new Map<string, DetectedTechnology>();
    for (const memory of memories) {
      const text = `${memory.title} ${memory.content} ${memory.tags.join(' ')}`;
      const found = TechnologyTracker.detectFromText(text, memory.tags);
      for (const tech of found) {
        const key = tech.name.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, tech);
        } else {
          // Merge tags
          const existing = seen.get(key)!;
          for (const tag of tech.tags) {
            if (!existing.tags.includes(tag)) existing.tags.push(tag);
          }
        }
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Extract technologies from repo summary techStack array + architecture text.
   */
  static detectFromTechStack(techStack: string[], architectureText: string): DetectedTechnology[] {
    const fromStack = techStack.flatMap(t =>
      TechnologyTracker.detectFromText(t),
    );
    const fromArch = TechnologyTracker.detectFromText(architectureText);
    const seen = new Map<string, DetectedTechnology>();
    for (const tech of [...fromStack, ...fromArch]) {
      if (!seen.has(tech.name.toLowerCase())) {
        seen.set(tech.name.toLowerCase(), tech);
      }
    }
    return Array.from(seen.values());
  }
}

function canonicalize(key: string): string {
  const map: Record<string, string> = {
    typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python',
    go: 'Go', rust: 'Rust', java: 'Java', kotlin: 'Kotlin', swift: 'Swift',
    ruby: 'Ruby', 'c#': 'C#', cpp: 'C++', php: 'PHP', scala: 'Scala',
    elixir: 'Elixir', haskell: 'Haskell',
    react: 'React', vue: 'Vue', angular: 'Angular', svelte: 'Svelte',
    nextjs: 'Next.js', nuxt: 'Nuxt', express: 'Express', fastapi: 'FastAPI',
    django: 'Django', flask: 'Flask', rails: 'Rails', spring: 'Spring',
    nestjs: 'NestJS', koa: 'Koa', hono: 'Hono', elysia: 'Elysia',
    docker: 'Docker', kubernetes: 'Kubernetes', terraform: 'Terraform',
    ansible: 'Ansible', webpack: 'Webpack', vite: 'Vite', esbuild: 'esbuild',
    rollup: 'Rollup', jest: 'Jest', vitest: 'Vitest', pytest: 'pytest',
    mocha: 'Mocha', eslint: 'ESLint', prettier: 'Prettier', git: 'Git',
    github: 'GitHub', gitlab: 'GitLab', graphql: 'GraphQL', grpc: 'gRPC',
    openapi: 'OpenAPI', aws: 'AWS', gcp: 'GCP', azure: 'Azure',
    vercel: 'Vercel', netlify: 'Netlify', cloudflare: 'Cloudflare',
    heroku: 'Heroku', fly: 'Fly.io', postgresql: 'PostgreSQL', mysql: 'MySQL',
    mongodb: 'MongoDB', redis: 'Redis', sqlite: 'SQLite', kafka: 'Kafka',
    rabbitmq: 'RabbitMQ', elasticsearch: 'Elasticsearch', supabase: 'Supabase',
    planetscale: 'PlanetScale', neon: 'Neon', rest: 'REST',
    microservices: 'Microservices', monorepo: 'Monorepo', tdd: 'TDD',
    bdd: 'BDD', ddd: 'DDD', cqrs: 'CQRS',
  };
  return map[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
