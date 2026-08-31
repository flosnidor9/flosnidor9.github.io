'use client';

import Image from '@/components/ArchiveImage';
import { motion } from 'framer-motion';
import type { Character } from '@/lib/data/characters';

export function LinkedCharacterButtons({
  characters,
  onSelect,
}: {
  characters: Character[];
  onSelect: (character: Character) => void;
}) {
  if (!characters.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-[0.35rem]">
      <span className="afterroll-meta mr-[0.1rem] text-[0.7rem] text-[var(--ledger-soft)]">연결 캐릭터</span>
      {characters.map((character) => (
        <button
          key={character.id}
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect(character); }}
          className="afterroll-meta inline-flex items-center gap-[0.28rem] rounded-full border border-[rgba(200,121,147,0.24)] bg-[rgba(255,248,250,0.72)] py-[0.12rem] pl-[0.18rem] pr-[0.5rem] text-[0.72rem] text-[var(--ledger-muted)] transition-colors hover:border-[var(--ledger-accent)] hover:text-[var(--ledger-ink)]"
          aria-label={`${character.name} 캐릭터 보기`}
        >
          <span className="relative size-[1.15rem] overflow-hidden rounded-full bg-[rgba(200,121,147,0.14)]">
            <Image src={character.portrait.cropped} alt="" fill sizes="1.15rem" className="object-cover" />
          </span>
          {character.name}
        </button>
      ))}
    </div>
  );
}

export default function CharacterPreviewModal({
  character,
  onClose,
  onBackdropClose = onClose,
}: {
  character: Character;
  onClose: () => void;
  onBackdropClose?: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-[rgba(76,51,61,0.36)] p-[0.8rem] backdrop-blur-[0.125rem] sm:backdrop-blur-[0.25rem] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onBackdropClose}
    >
      <motion.article
        className="ledger-paper-sheet w-full max-w-[25rem] rounded-[1rem] p-[1rem] shadow-xl"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[0.8rem]">
          <div className="flex min-w-0 items-center gap-[0.75rem]">
            <div className="relative size-[4.2rem] shrink-0 overflow-hidden rounded-[0.65rem] bg-[rgba(200,121,147,0.13)]">
              <Image src={character.portrait.cropped} alt={`${character.name}의 외형`} fill sizes="4.2rem" className="object-cover" />
            </div>
            <div className="min-w-0">
              {character.alias && <p className="afterroll-meta truncate text-[0.72rem] text-[var(--ledger-soft)]">{character.alias}</p>}
              <h2 className="afterroll-title truncate text-[1.35rem] text-[var(--ledger-ink)]">{character.name}</h2>
              {character.catchphrase && <p className="afterroll-meta mt-[0.18rem] line-clamp-2 text-[0.74rem] text-[var(--ledger-muted)]">“{character.catchphrase}”</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="afterroll-meta text-[1.1rem] text-[var(--ledger-soft)] hover:text-[var(--ledger-ink)]" aria-label="캐릭터 미리보기 닫기">×</button>
        </div>
        {(character.occupation || character.species || character.personality) && <div className="mt-[0.85rem] border-t border-[rgba(87,67,48,0.1)] pt-[0.75rem]">
          {(character.occupation || character.species) && <p className="afterroll-meta text-[0.76rem] text-[var(--ledger-muted)]">{[character.occupation, character.species].filter(Boolean).join(' · ')}</p>}
          {character.personality && <p className="afterroll-body mt-[0.4rem] whitespace-pre-wrap text-[0.82rem] leading-[1.55] text-[var(--ledger-ink)]">{character.personality}</p>}
        </div>}
      </motion.article>
    </motion.div>
  );
}
