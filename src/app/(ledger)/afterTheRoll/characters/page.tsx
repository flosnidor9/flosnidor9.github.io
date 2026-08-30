import CharactersSection from '@/components/characters/CharactersSection';
import { CHARACTERS } from '@/lib/data/characters';

export const dynamic = 'force-static';

export default function CharactersPage() {
  return <CharactersSection characters={CHARACTERS} />;
}
