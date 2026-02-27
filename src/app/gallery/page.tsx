import { Suspense } from 'react';
import { getFolders } from '@/lib/data/folders';
import GalleryClient from './GalleryClient';

export default function GalleryPage() {
  const folders = getFolders();

  return (
    <main className="relative min-h-screen pt-[3.5rem]">
      <Suspense fallback={null}>
        <GalleryClient folders={folders} />
      </Suspense>
    </main>
  );
}
