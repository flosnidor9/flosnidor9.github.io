import { Suspense } from 'react';
import { getFolders } from '@/lib/data/folders';
import GalleryClient from './GalleryClient';

export default function GalleryPage() {
  const folders = getFolders(null);

  return (
    <main className="relative min-h-screen pt-[3.5rem]">
      <Suspense fallback={null}>
        <GalleryClient
          folders={folders}
          title="Gallery"
          description="Top-level categories"
        />
      </Suspense>
    </main>
  );
}
