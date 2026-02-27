import fs from 'fs';
import path from 'path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const EXCLUDED = new Set(['favorites']);

export type FolderData = {
  slug: string;
  title: string;
  thumbnail: string | null;
  tags: string[];
  count: number;
};

function formatTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getFolders(): FolderData[] {
  const base = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(base)) return [];

  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !EXCLUDED.has(d.name))
    .map((d) => {
      const dir = path.join(base, d.name);
      const files = fs
        .readdirSync(dir)
        .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()));

      return {
        slug: d.name,
        title: formatTitle(d.name),
        thumbnail: files.length ? `/images/${d.name}/${files[0]}` : null,
        tags: [d.name],
        count: files.length,
      };
    })
    .filter((f) => f.count > 0);
}

export function getFolder(slug: string): FolderData | null {
  const folders = getFolders();
  return folders.find((f) => f.slug === slug) ?? null;
}

export function getFolderImages(slug: string): string[] {
  const base = path.join(process.cwd(), 'public', 'images', slug);
  if (!fs.existsSync(base)) return [];

  return fs
    .readdirSync(base)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => `/images/${slug}/${f}`);
}

export function getFolderContent(slug: string): string | null {
  const mdPath = path.join(process.cwd(), 'public', 'images', slug, 'content.md');
  if (!fs.existsSync(mdPath)) return null;
  return fs.readFileSync(mdPath, 'utf-8');
}

export type PostData = {
  slug: string;
  image: string | null;
  content: string | null;
};

export function getFolderPosts(folderSlug: string): PostData[] {
  const base = path.join(process.cwd(), 'public', 'images', folderSlug);
  if (!fs.existsSync(base)) return [];

  const files = fs.readdirSync(base);
  const postMap = new Map<string, { image?: string; content?: string }>();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const rawName = path.basename(file, ext);
    // 한글 유니코드 정규화 (NFD → NFC)
    const name = rawName.normalize('NFC');

    // content.md는 폴더 전체 설명용이므로 제외
    if (file === 'content.md') continue;

    if (!postMap.has(name)) {
      postMap.set(name, {});
    }

    const post = postMap.get(name)!;

    if (IMAGE_EXTS.has(ext)) {
      post.image = `/images/${folderSlug}/${file}`;
    } else if (ext === '.md') {
      const mdPath = path.join(base, file);
      post.content = fs.readFileSync(mdPath, 'utf-8');
    }
  }

  return Array.from(postMap.entries())
    .filter(([, data]) => data.image || data.content)
    .map(([slug, data]) => ({
      slug,
      image: data.image ?? null,
      content: data.content ?? null,
    }));
}
