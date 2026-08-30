'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Character } from '@/lib/data/characters';
import CharacterUploadButton from '@/components/characters/CharacterUploadButton';

const HOVER_ROTATIONS = [-1.1, -0.65, -0.45, 0.7, 1.15] as const;
const HOVER_LIFT = '-0.35rem';
const TAP_SCALE = 0.98;

function getHoverRotation() {
  return HOVER_ROTATIONS[Math.floor(Math.random() * HOVER_ROTATIONS.length)];
}

function Polaroid({ character, onOpen }: { character: Character; onOpen: () => void }) {
  const [hoverRotation, setHoverRotation] = useState(0);

  return <motion.button type="button" layoutId={`pc-${character.id}`} onClick={onOpen} onHoverStart={() => setHoverRotation(getHoverRotation())} whileHover={{ y: HOVER_LIFT, rotate: hoverRotation }} whileTap={{ scale: TAP_SCALE }} className="pc-polaroid group w-full text-left" aria-label={`${character.name} 캐릭터 상세 보기`}>
    <div className="pc-polaroid-photo relative aspect-square overflow-hidden bg-[rgba(200,121,147,0.13)]"><Image src={character.portrait.cropped} alt={`${character.name}의 외형`} fill sizes="(max-width: 48rem) 50vw, (max-width: 80rem) 33vw, 15rem" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /><div className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 0.8rem rgba(0,0,0,0.18)' }} /></div>
    <div className="px-[0.2rem] pb-[1rem] pt-[0.55rem]"><p className="afterroll-meta min-h-[1rem] truncate text-[0.72rem] text-[var(--atr-muted)]">{character.alias ?? '\u00a0'}</p><p className="afterroll-title truncate text-[1.35rem] text-[var(--atr-text)]">{character.name}</p><p className="afterroll-meta mt-[0.7rem] border-t border-dashed border-[rgba(200,121,147,0.3)] pt-[0.46rem] text-[0.68rem] text-[var(--atr-soft)]">{character.sessionKeys.length} sessions</p></div>
  </motion.button>;
}

function CharacterDetail({ character, onClose, onShowOriginal }: { character: Character; onClose: () => void; onShowOriginal: () => void }) {
  const facts = [['나이', character.age], ['성별', character.gender], ['키 / 몸무게', character.heightWeight], ['직업', character.occupation], ['종족', character.species]].filter(([, value]) => value);
  const linkItems = character.linkItems ?? [];
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(76,51,61,0.3)] p-[0.7rem] backdrop-blur-[0.25rem] sm:items-center" onClick={onClose}>
    <motion.article layoutId={`pc-${character.id}`} onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="pc-detail w-full max-w-[48rem] overflow-y-auto"><button className="pc-detail-close" type="button" onClick={onClose}>닫기</button><div className="grid items-center gap-[1.4rem] sm:grid-cols-[minmax(0,15rem)_1fr]"><div className="pc-polaroid"><button type="button" className="pc-polaroid-photo relative block aspect-square w-full cursor-zoom-in overflow-hidden" onClick={onShowOriginal} aria-label="원본 사진 보기"><Image src={character.portrait.cropped} alt={`${character.name}의 외형`} fill sizes="15rem" className="object-cover" /><div className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 0.8rem rgba(0,0,0,0.18)' }} /></button><div className="px-[0.2rem] pb-[1rem] pt-[0.55rem]">{character.alias && <p className="afterroll-meta text-[0.75rem] text-[var(--atr-muted)]">{character.alias}</p>}<p className="afterroll-title text-[1.6rem] text-[var(--atr-text)]">{character.name}</p></div></div><div><dl className="mt-[0.6rem] grid gap-x-[1rem] gap-y-[0.5rem] sm:grid-cols-2">{facts.map(([label, value]) => <div key={label}><dt className="pc-field-label">{label}</dt><dd className="afterroll-meta text-[0.84rem] text-[var(--atr-text)]">{value}</dd></div>)}</dl>{character.personality && <div className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><p className="pc-field-label">성격</p><p className="afterroll-body whitespace-pre-wrap text-[0.88rem] leading-[1.7] text-[var(--atr-muted)]">{character.personality}</p></div>}<div className="mt-[1rem] flex flex-wrap gap-[0.5rem]">{linkItems.map((link) => <a key={`${link.name}-${link.url}`} className="pc-link" href={link.url} target="_blank" rel="noreferrer">{link.name} ↗</a>)}{character.links.characterSheet && <a className="pc-link" href={character.links.characterSheet} target="_blank" rel="noreferrer">캐릭터 시트 ↗</a>}{character.links.commission && <a className="pc-link" href={character.links.commission} target="_blank" rel="noreferrer">커미션 ↗</a>}</div><p className="afterroll-meta mt-[1rem] text-[0.72rem] text-[var(--atr-soft)]">참여 세션 {character.sessionKeys.length}회</p></div></div></motion.article>
  </div>;
}

export default function CharactersSection({ characters }: { characters: Character[] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Character | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const visible = useMemo(() => { const needle = query.trim().toLowerCase(); return needle ? characters.filter((character) => `${character.name} ${character.alias ?? ''}`.toLowerCase().includes(needle)) : characters; }, [characters, query]);
  return <section className="pc-archive afterroll-desk mx-auto min-h-full max-w-[72rem] px-[1.1rem] py-[0.7rem] sm:py-[1.1rem] md:px-[2rem]"><header className="relative z-[1] mb-[1rem] flex flex-wrap items-center justify-between gap-[0.75rem] border-b border-[var(--atr-line)] pb-[0.85rem]"><div><p className="afterroll-meta text-[0.74rem] uppercase tracking-[0.14em] text-[var(--atr-soft)]">Character List</p><h1 className="afterroll-title mt-[0.18rem] text-[2.4rem] leading-none text-[var(--atr-text)]">캐릭터 목록</h1></div><CharacterUploadButton /></header><div className="relative z-[1] mb-[1.5rem] max-w-[22rem]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 별칭으로 찾기" className="pc-field" aria-label="캐릭터 검색" /></div>{visible.length ? <div className="relative z-[1] grid grid-cols-2 gap-x-[1rem] gap-y-[1.6rem] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map((character) => <div key={character.id}><Polaroid character={character} onOpen={() => setSelected(character)} /></div>)}</div> : <p className="relative z-[1] afterroll-meta py-[4rem] text-center text-[0.78rem] text-[var(--atr-muted)]">아직 보관된 캐릭터가 없습니다.</p>}<AnimatePresence>{selected && <CharacterDetail character={selected} onClose={() => setSelected(null)} onShowOriginal={() => setOriginalUrl(selected.portrait.original)} />}</AnimatePresence><AnimatePresence>{originalUrl && <motion.div key="lightbox" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 cursor-zoom-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setOriginalUrl(null)}><motion.div className="relative h-[85vh] w-[85vw]" initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} transition={{ duration: 0.25 }}><Image src={originalUrl} alt="원본 사진" fill className="object-contain" /></motion.div></motion.div>}</AnimatePresence></section>;
}
