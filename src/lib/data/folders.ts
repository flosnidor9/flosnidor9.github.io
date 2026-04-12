import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const FOLDER_META_FILE = 'folder.json';
const IGNORED_FOLDER_NAMES = new Set(['media']);

// Gallery type definitions
const GALLERY_ROOTS = {
  bubble: path.join(PUBLIC_ROOT, 'images', 'bubble'),
  film: path.join(PUBLIC_ROOT, 'images', 'film'),
  trpg: path.join(PUBLIC_ROOT, 'images', 'afterTheRoll'),
} as const;

export type GalleryType = keyof typeof GALLERY_ROOTS;

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export type FolderData = {
  slug: string;
  title: string;
  name: string;
  depth: number;
  parentSlug: string | null;
  isLeaf: boolean;
  childCount: number;
  thumbnail: string | null;
  orientation: ImageOrientation;
  aspectRatio: number;
  tags: string[];
  count: number;
};

type FolderMeta = {
  thumbnail?: string;
};

function getThumbnailMeta(absPath: string): { orientation: ImageOrientation; aspectRatio: number } {
  try {
    const { width = 1, height = 1 } = sizeOf(fs.readFileSync(absPath));
    const ratio = width / height;
    const orientation: ImageOrientation =
      ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square';
    return { orientation, aspectRatio: ratio };
  } catch {
    return { orientation: 'landscape', aspectRatio: 1.5 };
  }
}

function formatTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSlugSegments(slug: string): string[] {
  return slug
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..');
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function toPublicUrl(absPath: string): string {
  const rel = toPosix(path.relative(PUBLIC_ROOT, absPath));
  return `/${rel}`;
}

function readFolderMeta(absDir: string): FolderMeta | null {
  const metaPath = path.join(absDir, FOLDER_META_FILE);
  if (!fs.existsSync(metaPath)) return null;

  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(raw) as FolderMeta;
    return parsed;
  } catch {
    return null;
  }
}

function resolveCustomThumbnailAbs(absDir: string, meta: FolderMeta | null): string | null {
  const raw = meta?.thumbnail?.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\\/g, '/');
  const absPath = normalized.startsWith('/')
    ? path.join(PUBLIC_ROOT, normalized.replace(/^\/+/, ''))
    : path.join(absDir, normalized);

  if (!fs.existsSync(absPath)) return null;
  const stat = fs.statSync(absPath);
  if (!stat.isFile()) return null;

  const ext = path.extname(absPath).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return null;

  return absPath;
}

type FolderNode = {
  slug: string;
  name: string;
  depth: number;
  parentSlug: string | null;
  isLeaf: boolean;
  childCount: number;
  count: number;
  title: string;
  tags: string[];
  thumbnail: string | null;
  orientation: ImageOrientation;
  aspectRatio: number;
};

type FolderNodeBuild = FolderNode & {
  totalPostCount: number;
  thumbnailAbs: string | null;
};

function listChildDirs(absDir: string): fs.Dirent[] {
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !IGNORED_FOLDER_NAMES.has(d.name));
}

function listDirectImages(absDir: string): string[] {
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXTS.has(path.extname(d.name).toLowerCase()))
    .map((d) => d.name);
}

function listDirectPostSlugs(absDir: string): string[] {
  const slugs = new Set<string>();

  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name === 'content.md' || entry.name === FOLDER_META_FILE || entry.name === 'order.json') continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext) && ext !== '.md') continue;

    slugs.add(path.basename(entry.name, ext).normalize('NFC'));
  }

  return Array.from(slugs);
}

function getGalleryPrefix(galleryType: GalleryType): 'bubble' | 'film' | 'afterTheRoll' {
  if (galleryType === 'trpg') return 'afterTheRoll';
  return galleryType;
}

function buildFolderNode(absDir: string, segments: string[], output: FolderNode[], galleryType: GalleryType): FolderNodeBuild {
  const folderMeta = readFolderMeta(absDir);
  const childDirs = listChildDirs(absDir);
  const childResults = childDirs.map((child) =>
    buildFolderNode(path.join(absDir, child.name), [...segments, child.name], output, galleryType),
  );

  const directImages = listDirectImages(absDir);
  const directPostSlugs = listDirectPostSlugs(absDir);
  const depth = segments.length;
  const slug = segments.join('/');
  const name = segments[segments.length - 1] ?? '';
  const parentSlug = depth > 1 ? segments.slice(0, -1).join('/') : null;
  const isLeaf = childResults.length === 0;
  const childCount = childResults.length;
  const totalPostCount = directPostSlugs.length + childResults.reduce((sum, child) => sum + child.totalPostCount, 0);

  const customThumbnailAbs = resolveCustomThumbnailAbs(absDir, folderMeta);
  const thumbnailAbs =
    customThumbnailAbs ??
    (directImages.length > 0
      ? path.join(absDir, directImages[0])
      : childResults.find((child) => child.thumbnailAbs)?.thumbnailAbs ?? null);

  const { orientation, aspectRatio } = thumbnailAbs
    ? getThumbnailMeta(thumbnailAbs)
    : { orientation: 'landscape' as ImageOrientation, aspectRatio: 1.5 };

  const node: FolderNodeBuild = {
    slug,
    name,
    depth,
    parentSlug,
    isLeaf,
    childCount,
    count: isLeaf ? directPostSlugs.length : totalPostCount,
    title: formatTitle(name),
    tags: toSlugSegments(slug),
    thumbnail: thumbnailAbs ? toPublicUrl(thumbnailAbs) : null,
    orientation,
    aspectRatio,
    totalPostCount,
    thumbnailAbs,
  };

  output.push({
    slug: node.slug,
    name: node.name,
    depth: node.depth,
    parentSlug: node.parentSlug,
    isLeaf: node.isLeaf,
    childCount: node.childCount,
    count: node.count,
    title: node.title,
    tags: node.tags,
    thumbnail: node.thumbnail,
    orientation: node.orientation,
    aspectRatio: node.aspectRatio,
  });

  return node;
}

function buildFolderIndex(galleryType: GalleryType = 'bubble'): FolderData[] {
  const galleryRoot = GALLERY_ROOTS[galleryType];
  if (!fs.existsSync(galleryRoot)) return [];

  const nodes: FolderNode[] = [];
  const roots = listChildDirs(galleryRoot);
  for (const root of roots) {
    buildFolderNode(path.join(galleryRoot, root.name), [root.name], nodes, galleryType);
  }

  return nodes.sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
}

export function getFolders(parentSlug: string | null = null, galleryType: GalleryType = 'bubble'): FolderData[] {
  const parent = parentSlug ? toSlugSegments(parentSlug).join('/') : null;
  const folders = buildFolderIndex(galleryType);
  return folders.filter((f) => f.parentSlug === parent);
}

export function getFolder(slug: string, galleryType: GalleryType = 'bubble'): FolderData | null {
  const normalized = toSlugSegments(slug).join('/');
  if (!normalized) return null;
  const folders = buildFolderIndex(galleryType);
  return folders.find((f) => f.slug === normalized) ?? null;
}

export function getAllFolderSlugs(galleryType: GalleryType = 'bubble'): string[] {
  return buildFolderIndex(galleryType).map((f) => f.slug);
}

export function getFolderImages(slug: string, galleryType: GalleryType = 'bubble'): string[] {
  const normalized = toSlugSegments(slug).join('/');
  if (!normalized) return [];
  const galleryRoot = GALLERY_ROOTS[galleryType];
  const base = path.join(galleryRoot, ...normalized.split('/'));
  if (!fs.existsSync(base)) return [];

  const galleryPrefix = getGalleryPrefix(galleryType);
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXTS.has(path.extname(d.name).toLowerCase()))
    .map((d) => `/images/${galleryPrefix}/${normalized}/${d.name}`);
}

export function getFolderContent(slug: string, galleryType: GalleryType = 'bubble'): string | null {
  const normalized = toSlugSegments(slug).join('/');
  if (!normalized) return null;
  const galleryRoot = GALLERY_ROOTS[galleryType];
  const mdPath = path.join(galleryRoot, ...normalized.split('/'), 'content.md');
  if (!fs.existsSync(mdPath)) return null;
  return fs.readFileSync(mdPath, 'utf-8');
}

export type PostData = {
  slug: string;
  image: string | null;
  width: number | null;
  height: number | null;
  content: string | null;
};

export function getFolderPosts(folderSlug: string, galleryType: GalleryType = 'bubble'): PostData[] {
  const normalized = toSlugSegments(folderSlug).join('/');
  if (!normalized) return [];
  const galleryRoot = GALLERY_ROOTS[galleryType];
  const base = path.join(galleryRoot, ...normalized.split('/'));
  if (!fs.existsSync(base)) return [];

  const files = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  const postMap = new Map<string, { image?: string; width?: number; height?: number; content?: string }>();
  const galleryPrefix = getGalleryPrefix(galleryType);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const rawName = path.basename(file, ext);
    const name = rawName.normalize('NFC');

    if (file === 'content.md') continue;

    if (!postMap.has(name)) {
      postMap.set(name, {});
    }

    const post = postMap.get(name)!;

    if (IMAGE_EXTS.has(ext)) {
      const imageAbsPath = path.join(base, file);
      const { width, height } = sizeOf(fs.readFileSync(imageAbsPath));
      post.image = `/images/${galleryPrefix}/${normalized}/${file}`;
      post.width = width;
      post.height = height;
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
      width: data.width ?? null,
      height: data.height ?? null,
      content: data.content ?? null,
    }));
}
