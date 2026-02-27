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
