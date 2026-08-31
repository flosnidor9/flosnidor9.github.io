import CharactersSection, { type SessionLogLink } from '@/components/characters/CharactersSection';
import { CHARACTERS } from '@/lib/data/characters';
import { getAllTrpgPosts } from '@/lib/data/trpg';
import { toGalleryPath } from '@/lib/galleryPath';

export const dynamic = 'force-static';

export default function CharactersPage() {
  const sessionLogLinks: SessionLogLink[] = getAllTrpgPosts().map((post) => ({
    sessionTitle: post.title,
    date: post.date,
    href: `/afterTheRoll/archive/read/${toGalleryPath(post.fullSlug)}`,
  }));

  return <CharactersSection characters={CHARACTERS} sessionLogLinks={sessionLogLinks} />;
}
