import { notFound } from 'next/navigation';
import {
  getAllFolderSlugs,
  getFolder,
  getFolderContent,
  getFolderPosts,
  getFolders,
} from '@/lib/data/folders';
import { fromGallerySegments, toGalleryPath } from '@/lib/galleryPath';
import GalleryClient from '../GalleryClient';
import FolderDetailScene from '@/components/folder/FolderDetailScene';

type Props = {
  params: Promise<{ folderPath?: string[] }>;
};

function toParentHref(slug: string): string {
  const segments = slug.split('/').filter(Boolean);
  if (segments.length <= 1) return '/bubbleHome/gallery';
  return `/bubbleHome/gallery/${toGalleryPath(segments.slice(0, -1).join('/'))}`;
}

function toParentSlug(slug: string): string | null {
  const segments = slug.split('/').filter(Boolean);
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join('/');
}

export async function generateStaticParams() {
  const params = getAllFolderSlugs().map((slug) => ({
    folderPath: slug.split('/'),
  }));

  return [{ folderPath: [] }, ...params];
}

export async function generateMetadata({ params }: Props) {
  const { folderPath = [] } = await params;
  if (folderPath.length === 0) {
    return {
      title: 'Gallery | Personal Archive',
      description: 'Top-level categories',
    };
  }

  const slug = fromGallerySegments(folderPath);
  if (!slug) return { title: 'Not Found' };

  const folder = getFolder(slug);
  if (!folder) return { title: 'Not Found' };

  return {
    title: `${folder.title} | Personal Archive`,
    description: folder.isLeaf
      ? `${folder.title} - ${folder.count} images`
      : `${folder.title} - ${folder.childCount} folders`,
  };
}

export default async function GalleryRoutePage({ params }: Props) {
  const { folderPath = [] } = await params;

  if (folderPath.length === 0) {
    const folders = getFolders(null);
    return (
      <main className="relative min-h-screen pt-[3.5rem]">
        <GalleryClient folders={folders} title="Gallery" description="Top-level categories" />
      </main>
    );
  }

  const slug = fromGallerySegments(folderPath);
  if (!slug) {
    notFound();
  }

  const folder = getFolder(slug);
  if (!folder) {
    notFound();
  }

  const backHref = toParentHref(slug);
  const parentSlug = toParentSlug(slug);
  const parentFolder = parentSlug ? getFolder(parentSlug) : null;
  const backLabel = parentFolder ? `Back to ${parentFolder.title}` : 'Back';

  if (!folder.isLeaf) {
    const children = getFolders(slug);
    return (
      <main className="relative min-h-screen pt-[3.5rem]">
        <GalleryClient
          folders={children}
          title={folder.title}
          description={`${folder.childCount} sub-folders`}
          backHref={backHref}
          backLabel={backLabel}
        />
      </main>
    );
  }

  const posts = getFolderPosts(slug);
  const content = getFolderContent(slug);

  return (
    <main>
      <FolderDetailScene folder={folder} posts={posts} content={content} backHref={backHref} backLabel={backLabel} />
    </main>
  );
}
