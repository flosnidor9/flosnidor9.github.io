import { notFound } from 'next/navigation';
import { getFolder, getFolders, getFolderContent, getFolderPosts } from '@/lib/data/folders';
import FolderDetailScene from '@/components/folder/FolderDetailScene';

type Props = {
  params: Promise<{ folder: string }>;
};

export async function generateStaticParams() {
  const folders = getFolders();
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

  const posts = getFolderPosts(slug);
  const content = getFolderContent(slug);

  return (
    <main>
      <FolderDetailScene folder={folder} posts={posts} content={content} />
    </main>
  );
}
