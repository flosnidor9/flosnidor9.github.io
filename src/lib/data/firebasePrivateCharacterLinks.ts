import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CharacterLink } from '@/lib/data/characters';
import { db } from '@/lib/firebase';

const COLLECTION = 'private_character_links';

function validLinks(links: CharacterLink[]) {
  return links.filter((link) => link.name.trim() && link.url.trim());
}

export function subscribeToPrivateCharacterLinks(
  characterId: string,
  callback: (links: CharacterLink[]) => void,
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, characterId), (snapshot) => {
    const links = snapshot.data()?.links;
    callback(Array.isArray(links) ? links as CharacterLink[] : []);
  });
}

export async function savePrivateCharacterLinks(characterId: string, links: CharacterLink[]) {
  const cleanedLinks = validLinks(links);
  const reference = doc(db, COLLECTION, characterId);

  if (!cleanedLinks.length) {
    await deleteDoc(reference);
    return;
  }

  await setDoc(reference, {
    links: cleanedLinks,
    updatedAt: serverTimestamp(),
  });
}
