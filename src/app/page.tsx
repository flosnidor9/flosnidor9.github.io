import fs from 'fs';
import path from 'path';
import HomeScene from '@/components/HomeScene';
import { getFolders } from '@/lib/data/folders';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

function getFavoriteImagePaths(): string[] {
  const dir = path.join(process.cwd(), 'public', 'images', 'favorites');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => `/images/favorites/${f}`);
}

export default function Home() {
  return (
    <main>
      <HomeScene
        imagePaths={getFavoriteImagePaths()}
        folders={getFolders()}
      />
    </main>
  );
}
