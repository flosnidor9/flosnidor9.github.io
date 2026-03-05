import { notFound, redirect } from 'next/navigation';
import { getFolder, getFolders } from '@/lib/data/folders';
import { encodeGalleryPath } from '@/lib/galleryPath';

type Props = {
  params: Promise<{ folder: string }>;
};

export async function generateStaticParams() {
  const folders = getFolders(null);
  return folders.map((f) => ({ folder: f.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { folder: slug } = await params;
  const folder = getFolder(slug);
  if (!folder) return { title: 'Not Found' };

  return {
    title: `${folder.title} | Personal Archive`,
    description: `${folder.title} - ${folder.count} images`,
  };
}

export default async function FolderPage({ params }: Props) {
  const { folder: slug } = await params;
  const folder = getFolder(slug);

  if (!folder) {
    notFound();
  }

  redirect(`/gallery/${encodeGalleryPath(folder.slug)}`);
}
