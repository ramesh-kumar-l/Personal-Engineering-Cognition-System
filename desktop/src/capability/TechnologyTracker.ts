import type { Memory } from '../storage/schema';
import type { TechnologyEntry } from '../storage/schema';

export type DetectedTechnology = {
  name: string;
  category: TechnologyEntry['category'];
  tags: string[];
};

const TECH_REGISTRY: Record<string, TechnologyEntry['category']> = {
  typescript: 'language', javascript: 'language', python: 'language',
  go: 'language', rust: 'language', java: 'language', kotlin: 'language',
  swift: 'language', ruby: 'language', 'c#': 'language', cpp: 'language',
  php: 'language', scala: 'language', elixir: 'language', haskell: 'language',
  react: 'framework', vue: 'framework', angular: 'framework', svelte: 'framework',
  nextjs: 'framework', nuxt: 'framework', express: 'framework', fastapi: 'framework',
  django: 'framework', flask: 'framework', rails: 'framework', spring: 'framework',
  nestjs: 'framework', koa: 'framework', hono: 'framework', elysia: 'framework',
  docker: 'tool', kubernetes: 'tool', terraform: 'tool', ansible: 'tool',
  webpack: 'tool', vite: 'tool', esbuild: 'tool', rollup: 'tool',
  jest: 'tool', vitest: 'tool', pytest: 'tool', mocha: 'tool',
  eslint: 'tool', prettier: 'tool', git: 'tool', github: 'tool',
  gitlab: 'tool', graphql: 'tool', grpc: 'tool', openapi: 'tool',
  aws: 'platform', gcp: 'platform', azure: 'platform', vercel: 'platform',
  netlify: 'platform', cloudflare: 'platform', heroku: 'platform', fly: 'platform',
  postgresql: 'service', mysql: 'service', mongodb: 'service', redis: 'service',
  sqlite: 'service', kafka: 'service', rabbitmq: 'service', elasticsearch: 'service',
  supabase: 'service', planetscale: 'service', neon: 'service',
  rest: 'pattern', microservices: 'pattern', monorepo: 'pattern',
  'event-driven': 'pattern', tdd: 'pattern', bdd: 'pattern', ddd: 'pattern', cqrs: 'pattern',
};

const sortedNames = Object.keys(TECH_REGISTRY).sort((a, b) => b.length - a.length);
const TECH_REGEX = new RegExp(
  `\\b(${sortedNames.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi',
);

export class TechnologyTracker {
  static detectFromText(text: string, contextTags: string[] = []): DetectedTechnology[] {
    const seen = new Map<string, DetectedTechnology>();
    for (const match of text.matchAll(TECH_REGEX)) {
      const key = match[1].toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { name: canonicalize(key), category: TECH_REGISTRY[key] ?? 'tool', tags: [...contextTags] });
      }
    }
    return Array.from(seen.values());
  }

  static detectFromMemories(memories: Memory[]): DetectedTechnology[] {
    const seen = new Map<string, DetectedTechnology>();
    for (const memory of memories) {
      const text = `${memory.title} ${memory.content} ${memory.tags.join(' ')}`;
      for (const tech of TechnologyTracker.detectFromText(text, memory.tags)) {
        const key = tech.name.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, tech);
        } else {
          const existing = seen.get(key)!;
          for (const tag of tech.tags) {
            if (!existing.tags.includes(tag)) existing.tags.push(tag);
          }
        }
      }
    }
    return Array.from(seen.values());
  }

  static detectFromTechStack(techStack: string[], architectureText: string): DetectedTechnology[] {
    const seen = new Map<string, DetectedTechnology>();
    for (const tech of [
      ...techStack.flatMap(t => TechnologyTracker.detectFromText(t)),
      ...TechnologyTracker.detectFromText(architectureText),
    ]) {
      if (!seen.has(tech.name.toLowerCase())) seen.set(tech.name.toLowerCase(), tech);
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
