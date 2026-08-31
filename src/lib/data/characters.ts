import characterArchive from '@/content/characters.json';

export type CharacterCrop = { x: number; y: number; zoom: number };
export type CharacterLink = { name: string; url: string };
export type CharacterSticker = {
  src: string;
  /** Detail-card sticker scale. Older entries without this use the default. */
  size?: number;
};

export type CharacterStat = { label: string; value: string };

export type CocCharacterData = {
  characteristics: CharacterStat[];
};

export type ShinobigamiCharacterData = {
  rank?: string;
  faction?: string;
  subfaction?: string;
  belief?: string;
  socialStatus?: string;
  setting?: string;
  ninpo: string[];
  secretArt?: { name: string; type: string };
};

export type InsaneCharacterData = {
  color?: string;
  abilities: string[];
};

export type Character = {
  id: string;
  name: string;
  alias?: string;
  catchphrase?: string;
  color?: string;
  age?: string;
  gender?: string;
  heightWeight?: string;
  occupation?: string;
  species?: string;
  personality?: string;
  /** Rule selected from the play-list rule options. */
  rule?: string;
  coc?: CocCharacterData;
  shinobigami?: ShinobigamiCharacterData;
  insane?: InsaneCharacterData;
  linkItems?: CharacterLink[];
  stickers?: CharacterSticker[];
  portrait: { original: string; cropped: string; crop: CharacterCrop };
  links: Record<string, string | undefined>;
  sessionKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export const CHARACTERS = characterArchive.characters as Character[];
