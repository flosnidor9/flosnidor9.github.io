import fs from 'fs';
import path from 'path';
import { TRPG_ASSET_PREFIX, TRPG_PUBLIC_ROOT } from '@/lib/trpgSource';

export type CharacterCrop = { x: number; y: number; zoom: number };
export type CharacterLink = { name: string; url: string };
export type CharacterCopyright = { name: string; url?: string };
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
  copyright?: CharacterCopyright;
  stickers?: CharacterSticker[];
  portrait: { original: string; cropped: string; crop: CharacterCrop };
  links: Record<string, string | undefined>;
  sessionKeys: string[];
  createdAt: string;
  updatedAt: string;
};

const CHARACTER_ARCHIVE_PATH = path.join(TRPG_PUBLIC_ROOT, 'characters', 'characters.json');
const CHARACTER_IMAGE_PATH_PREFIX = '/images/characters/';

function toCharacterAssetUrl(value: string) {
  if (!value.startsWith(CHARACTER_IMAGE_PATH_PREFIX)) return value;
  return `${TRPG_ASSET_PREFIX}/characters/${value.slice(CHARACTER_IMAGE_PATH_PREFIX.length)}`;
}

export function getCharacters(): Character[] {
  try {
    const archive = JSON.parse(fs.readFileSync(CHARACTER_ARCHIVE_PATH, 'utf8')) as { characters?: unknown };
    if (!Array.isArray(archive.characters)) return [];

    return (archive.characters as Character[]).map((character) => ({
      ...character,
      portrait: {
        ...character.portrait,
        original: toCharacterAssetUrl(character.portrait.original),
        cropped: toCharacterAssetUrl(character.portrait.cropped),
      },
      stickers: character.stickers?.map((sticker) => ({ ...sticker, src: toCharacterAssetUrl(sticker.src) })),
    }));
  } catch {
    return [];
  }
}
