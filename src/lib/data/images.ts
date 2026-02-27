import fs from 'fs';
import path from 'path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

export function getFavoriteImagePaths(): string[] {
  const dir = path.join(process.cwd(), 'public', 'images', 'favorites');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => `/images/favorites/${f}`);
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
