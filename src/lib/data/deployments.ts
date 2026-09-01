import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DEPLOYMENTS_ROOT = path.join(process.cwd(), 'public', 'images', 'afterTheRoll', 'deployments');

export type DeploymentPost = {
  slug: string;
  year: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  privateUrl?: string;
};

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function postFromFile(year: string, filePath: string): DeploymentPost | null {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, '.md');
  const privatePath = stringValue(data.privatePath).replace(/^\/+/, '');

  return {
    slug,
    year,
    title: stringValue(data.title, slug),
    date: stringValue(data.date),
    description: stringValue(data.description),
    tags: stringArray(data.tags),
    content,
    privateUrl: privatePath ? `/images/afterTheRoll/deployments/${encodeURIComponent(year)}/${encodeURIComponent(slug)}/${encodeURIComponent(privatePath)}` : undefined,
  };
}

export function getAllDeploymentPosts(): DeploymentPost[] {
  if (!fs.existsSync(DEPLOYMENTS_ROOT)) return [];

  const posts: DeploymentPost[] = [];
  for (const yearEntry of fs.readdirSync(DEPLOYMENTS_ROOT, { withFileTypes: true })) {
    if (!yearEntry.isDirectory()) continue;
    const yearPath = path.join(DEPLOYMENTS_ROOT, yearEntry.name);
    for (const postEntry of fs.readdirSync(yearPath, { withFileTypes: true })) {
      if (!postEntry.isDirectory()) continue;
      const postPath = path.join(yearPath, postEntry.name, `${postEntry.name}.md`);
      if (!fs.existsSync(postPath)) continue;
      const post = postFromFile(yearEntry.name, postPath);
      if (post) posts.push(post);
    }
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date, 'ko') || b.title.localeCompare(a.title, 'ko'));
}

export function getDeploymentPost(year: string, slug: string) {
  const postPath = path.join(DEPLOYMENTS_ROOT, year, slug, `${slug}.md`);
  return fs.existsSync(postPath) ? postFromFile(year, postPath) : null;
}

