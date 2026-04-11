import fs from 'fs';
import path from 'path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

function readImagePaths(dirName: string): string[] {
  const dir = path.join(process.cwd(), 'public', 'images', dirName);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => `/images/${dirName}/${f}`);
}

export function getFavoriteImagePaths(): string[] {
  return readImagePaths('bubbleHome');
}

export function getMainHomeImagePaths(): string[] {
  return readImagePaths('mainHome');
}

export function getStickerImagePaths(): string[] {
  return readImagePaths('Sticker');
}

export function getFilmHomeImagePaths(): string[] {
  return readImagePaths('filmHome');
}

export function getTrpgHomeImagePaths(): string[] {
  const trpgImages = readImagePaths('trpgHome');
  if (trpgImages.length > 0) return trpgImages;

  const fallbackImages = readImagePaths('filmHome');
  if (fallbackImages.length > 0) return fallbackImages;

  return readImagePaths('mainHome');
}

export type ImageItem = {
  src: string;
  alt: string;
  tags: string[];
};

// 이미지를 추가할 때 'favorites' 태그를 붙이면 히어로 섹션에 무작위로 표시됩니다.
export const images: ImageItem[] = [
  { src: '/images/banana님 커미션.png', alt: '', tags: ['favorites'] },
];

export function getFavorites(): ImageItem[] {
  return images.filter((img) => img.tags.includes('favorites'));
}
