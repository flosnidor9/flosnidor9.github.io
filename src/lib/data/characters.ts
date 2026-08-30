import characterArchive from '@/content/characters.json';

export type CharacterCrop = { x: number; y: number; zoom: number };
export type CharacterLink = { name: string; url: string };
export type CharacterSticker = { src: string };

export type Character = {
  id: string;
  name: string;
  alias?: string;
  catchphrase?: string;
  age?: string;
  gender?: string;
  heightWeight?: string;
  occupation?: string;
  species?: string;
  personality?: string;
  linkItems?: CharacterLink[];
  stickers?: CharacterSticker[];
  portrait: { original: string; cropped: string; crop: CharacterCrop };
  links: Record<string, string | undefined>;
  sessionKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export const CHARACTERS = characterArchive.characters as Character[];
