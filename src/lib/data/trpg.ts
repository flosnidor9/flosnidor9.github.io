import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllFolderSlugs } from '@/lib/data/folders';

const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const TRPG_ROOT = path.join(PUBLIC_ROOT, 'images', 'trpg');

export type TrpgPostMeta = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  gmName: string;
  gmIconSrc: string;
  cast: Array<{ plName: string; pcName: string; iconSrc: string }>;
  htmlPath: string;
  htmlUrl: string;
};

export type TrpgArchivePostMeta = TrpgPostMeta & {
  folderSlug: string;
  fullSlug: string;
  scenarioTitle: string;
};

function normalizeSlug(slug: string): string {
  return slug
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

function toFolderAbs(folderSlug: string): string {
  return path.join(TRPG_ROOT, ...normalizeSlug(folderSlug).split('/'));
}

function toPostAbsPath(folderSlug: string, postSlug: string): string {
  return path.join(toFolderAbs(folderSlug), `${postSlug}.md`);
}

function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function ensureString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function ensureCast(value: unknown): Array<{ plName: string; pcName: string; iconSrc: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return {
        plName: ensureString(record.plName),
        pcName: ensureString(record.pcName),
        iconSrc: ensureString(record.iconSrc),
      };
    })
    .filter((item): item is { plName: string; pcName: string; iconSrc: string } => Boolean(item?.plName || item?.pcName));
}

function parsePostMeta(folderSlug: string, fileName: string): TrpgPostMeta | null {
  const postSlug = path.basename(fileName, '.md');
  const raw = fs.readFileSync(path.join(toFolderAbs(folderSlug), fileName), 'utf8');
  const { data } = matter(raw);

  const htmlPath = ensureString(data.htmlPath);
  if (!htmlPath) return null;

  return {
    slug: postSlug,
    title: ensureString(data.title, postSlug),
    description: ensureString(data.description),
    tags: ensureArray(data.tags),
    gmName: ensureString(data.gmName),
    gmIconSrc: ensureString(data.gmIconSrc),
    cast: ensureCast(data.cast),
    htmlPath,
    htmlUrl: toTrpgPublicUrl(folderSlug, htmlPath),
  };
}

function toTrpgPublicUrl(folderSlug: string, htmlPath: string): string {
  const normalizedFolder = normalizeSlug(folderSlug);
  const normalizedPath = htmlPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalizedPath.startsWith('images/')) return `/${normalizedPath}`;
  return `/images/trpg/${normalizedFolder}/${normalizedPath}`;
}

export function getTrpgPosts(folderSlug: string): TrpgPostMeta[] {
  const folderAbs = toFolderAbs(folderSlug);
  if (!fs.existsSync(folderAbs)) return [];

  return fs
    .readdirSync(folderAbs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'content.md')
    .map((entry) => parsePostMeta(folderSlug, entry.name))
    .filter((post): post is TrpgPostMeta => Boolean(post))
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

export function getTrpgPost(folderSlug: string, postSlug: string): TrpgPostMeta | null {
  const postPath = toPostAbsPath(folderSlug, postSlug);
  if (!fs.existsSync(postPath)) return null;
  return parsePostMeta(folderSlug, `${postSlug}.md`);
}

function resolvePublicHtmlAbs(folderSlug: string, htmlPath: string): string | null {
  const normalized = htmlPath.replace(/\\/g, '/');
  const absPath = normalized.startsWith('/')
    ? path.join(PUBLIC_ROOT, normalized.replace(/^\/+/, ''))
    : path.join(toFolderAbs(folderSlug), normalized);

  const resolved = path.resolve(absPath);
  if (!resolved.startsWith(path.resolve(PUBLIC_ROOT))) return null;
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

export function getTrpgPostHtml(folderSlug: string, postSlug: string): string | null {
  const post = getTrpgPost(folderSlug, postSlug);
  if (!post) return null;

  const htmlAbs = resolvePublicHtmlAbs(folderSlug, post.htmlPath);
  if (!htmlAbs) return null;
  const html = fs.readFileSync(htmlAbs, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

export function getTrpgPostHtmlUrl(folderSlug: string, postSlug: string): string | null {
  const post = getTrpgPost(folderSlug, postSlug);
  return post?.htmlUrl ?? null;
}

export function getAllTrpgPostParams(): Array<{ folderSlug: string; postSlug: string }> {
  return getAllFolderSlugs('trpg').flatMap((folderSlug) =>
    getTrpgPosts(folderSlug).map((post) => ({
      folderSlug,
      postSlug: post.slug,
    })),
  );
}

export function getAllTrpgPosts(): TrpgArchivePostMeta[] {
  return getAllFolderSlugs('trpg')
    .flatMap((folderSlug) => {
      const scenarioTitle = folderSlug.split('/').filter(Boolean).at(-1) ?? folderSlug;

      return getTrpgPosts(folderSlug).map((post) => ({
        ...post,
        folderSlug,
        fullSlug: `${folderSlug}/${post.slug}`,
        scenarioTitle,
      }));
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}
