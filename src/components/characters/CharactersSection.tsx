'use client';

import Image from '@/components/ArchiveImage';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Character, CharacterLink } from '@/lib/data/characters';
import { getShinobigamiMark } from '@/lib/shinobigamiMarks';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToPrivateCharacterLinks } from '@/lib/data/firebasePrivateCharacterLinks';
import CharacterUploadButton from '@/components/characters/CharacterUploadButton';
import CharacterManagementActions from '@/components/characters/CharacterManagementActions';
import { subscribeToPlays, type PlayEntry } from '@/lib/data/firebasePlays';

const HOVER_ROTATIONS = [-1.1, -0.65, -0.45, 0.7, 1.15] as const;
const HOVER_LIFT = '-0.35rem';
const DETAIL_ENTER_DURATION = 0.28;
const STICKER_ENTER_DELAY = 0.34;
const STICKER_STAGGER = 0.12;
const STICKER_EXIT_DURATION = 0.12;
const DEFAULT_STICKER_SIZE = 1;
const STICKER_BASE_SIZE_COMPACT_REM = 4.7;
const STICKER_BASE_SIZE_DESKTOP_REM = 5.2;
const STICKER_COMPACT_EDGE_INSET = '2.5rem';
const STICKER_POSITIONS = [
  { left: '0%', top: '12%', compactInsetX: STICKER_COMPACT_EDGE_INSET, compactInsetY: '0rem' },
  { left: '100%', top: '43%', compactInsetX: `-${STICKER_COMPACT_EDGE_INSET}`, compactInsetY: '0rem' },
  { left: '70%', top: '100%', compactInsetX: '0rem', compactInsetY: `-${STICKER_COMPACT_EDGE_INSET}` },
  { left: '20%', top: '100%', compactInsetX: '0rem', compactInsetY: `-${STICKER_COMPACT_EDGE_INSET}` },
  { left: '0%', top: '64%', compactInsetX: STICKER_COMPACT_EDGE_INSET, compactInsetY: '0rem' },
] as const;
const SESSION_STATUS_LABEL: Record<PlayEntry['status'], string> = {
  scheduled: '예정', ongoing: '진행', completed: '완주', dropped: '하차',
};
const SESSION_STATUS_PRIORITY: Record<PlayEntry['status'], number> = {
  scheduled: 0,
  ongoing: 1,
  completed: 2,
  dropped: 3,
};
const UNLINKED_CHARACTER_PRIORITY = Number.MAX_SAFE_INTEGER;
const HEX_COLOR = /^#[\da-f]{6}$/i;

function latestSessionDate(session: PlayEntry) {
  return session.endDate ?? session.startDate;
}

function compareCharactersBySessions(aSessions: PlayEntry[], bSessions: PlayEntry[]) {
  const aPriority = aSessions.reduce(
    (priority, session) => Math.min(priority, SESSION_STATUS_PRIORITY[session.status]),
    UNLINKED_CHARACTER_PRIORITY,
  );
  const bPriority = bSessions.reduce(
    (priority, session) => Math.min(priority, SESSION_STATUS_PRIORITY[session.status]),
    UNLINKED_CHARACTER_PRIORITY,
  );
  const statusDifference = aPriority - bPriority;
  if (statusDifference !== 0) return statusDifference;

  const aLatestDate = aSessions.reduce((latest, session) => {
    const date = latestSessionDate(session);
    return date > latest ? date : latest;
  }, '');
  const bLatestDate = bSessions.reduce((latest, session) => {
    const date = latestSessionDate(session);
    return date > latest ? date : latest;
  }, '');
  return bLatestDate.localeCompare(aLatestDate);
}

function stickerRotation(characterId: string, index: number) {
  const seed = [...`${characterId}-${index}`].reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return (seed % 15) - 7;
}

function getHoverRotation() {
  return HOVER_ROTATIONS[Math.floor(Math.random() * HOVER_ROTATIONS.length)];
}

function Polaroid({ character, sessions, onOpen, onUpdated, onDeleted }: { character: Character; sessions: PlayEntry[]; onOpen: () => void; onUpdated: (character: Character) => void; onDeleted: () => void }) {
  const [hoverRotation, setHoverRotation] = useState(0);
  const shinobigamiMark = getShinobigamiMark(character.shinobigami?.subfaction);
  return <motion.div layoutId={`pc-${character.id}`} onHoverStart={() => setHoverRotation(getHoverRotation())} whileHover={{ y: HOVER_LIFT, rotate: hoverRotation }} className="pc-polaroid group relative w-full"><button type="button" onClick={onOpen} className="block w-full text-left active:scale-[0.98]" aria-label={`${character.name} 캐릭터 상세 보기`}>
    <div className="pc-polaroid-photo relative aspect-square overflow-hidden bg-[rgba(200,121,147,0.13)]"><Image src={character.portrait.cropped} alt={`${character.name}의 외형`} fill sizes="(max-width: 48rem) 50vw, (max-width: 80rem) 33vw, 15rem" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />{shinobigamiMark && <div className="pointer-events-none absolute right-[0.5rem] top-[0.5rem] z-[2] size-[2.8rem] rounded-full bg-[rgba(255,252,248,0.78)] p-[0.28rem] shadow-[0_0.1rem_0.45rem_rgba(54,35,44,0.3)]"><Image src={shinobigamiMark} alt={`${character.shinobigami?.subfaction} 문양`} fill sizes="2.8rem" className="object-contain p-[0.28rem]" /></div>}<div className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 0.8rem rgba(0,0,0,0.18)' }} /></div>
    <div className="px-[0.2rem] pb-[1rem] pt-[0.55rem]"><p className="afterroll-meta min-h-[1rem] truncate text-[0.72rem] text-[var(--atr-muted)]">{character.alias ?? '\u00a0'}</p><p className="afterroll-title truncate text-[1.35rem] text-[var(--atr-text)]">{character.name}</p>{character.catchphrase && <p className="afterroll-meta mt-[0.16rem] truncate text-[0.68rem] text-[var(--atr-soft)]">“{character.catchphrase}”</p>}<p className="afterroll-meta mt-[0.7rem] border-t border-dashed border-[rgba(200,121,147,0.3)] pt-[0.46rem] text-[0.68rem] text-[var(--atr-soft)]">{sessions.length ? sessions.map((session) => session.title).join(' · ') : '연결된 세션 없음'}</p></div>
  </button><CharacterManagementActions character={character} onUpdated={onUpdated} onDeleted={onDeleted} /></motion.div>;
}

function CocDetails({ character }: { character: Character }) {
  if (!character.coc?.characteristics.length) return null;
  return <section className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><p className="pc-field-label">특성치</p><dl className="mt-[0.4rem] grid grid-cols-3 gap-x-[0.7rem] gap-y-[0.35rem]">{character.coc.characteristics.map((stat) => <div key={stat.label} className="flex items-baseline gap-[0.35rem]"><dt className="afterroll-meta text-[0.72rem] text-[var(--atr-soft)]">{stat.label}</dt><dd className="afterroll-meta text-[0.76rem] text-[var(--atr-text)]">{stat.value}</dd></div>)}</dl></section>;
}

function ShinobigamiDetails({ character }: { character: Character }) {
  if (!character.shinobigami) return null;
  const data = character.shinobigami;
  const facts = [['계급', data.rank], ['유파', data.faction], ['하위 유파', data.subfaction], ['신념', data.belief], ['신분', data.socialStatus]].filter(([, value]) => value);
  return <section className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><dl className="grid grid-cols-2 gap-x-[0.7rem] gap-y-[0.35rem]">{facts.map(([label, value]) => <div key={label}><dt className="pc-field-label">{label}</dt><dd className="afterroll-meta text-[0.76rem] text-[var(--atr-text)]">{value}</dd></div>)}</dl>{data.secretArt && <p className="afterroll-meta mt-[0.65rem] text-[0.78rem] text-[var(--atr-muted)]"><span className="text-[var(--atr-soft)]">오의</span> {data.secretArt.name} · {data.secretArt.type}</p>}{data.ninpo.length > 0 && <div className="mt-[0.65rem]"><p className="pc-field-label">인법</p><p className="afterroll-meta mt-[0.3rem] text-[0.76rem] leading-[1.6] text-[var(--atr-muted)]">{data.ninpo.join(' · ')}</p></div>}</section>;
}

function InsaneDetails({ character }: { character: Character }) {
  if (!character.insane) return null;
  const { abilities } = character.insane;
  return <section className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]">{abilities.length > 0 && <div><p className="pc-field-label">어빌리티</p><p className="afterroll-meta mt-[0.3rem] text-[0.76rem] leading-[1.6] text-[var(--atr-muted)]">{abilities.join(' · ')}</p></div>}</section>;
}

function CharacterDetail({ character, sessions, onClose, onShowOriginal }: { character: Character; sessions: PlayEntry[]; onClose: () => void; onShowOriginal: () => void }) {
  const { isAdmin } = useAuth();
  const facts = [['룰', character.rule], ['Color', character.color ?? character.insane?.color], ['나이', character.age], ['성별', character.gender], ['키 / 몸무게', character.heightWeight], ['직업', character.occupation]].filter(([, value]) => value);
  const linkItems = character.linkItems ?? [];
  const [privateLinkItems, setPrivateLinkItems] = useState<CharacterLink[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToPrivateCharacterLinks(character.id, setPrivateLinkItems);
  }, [character.id, isAdmin]);
  const closeDetail = () => {
    if (isClosing) return;
    if (!(character.stickers?.length)) { onClose(); return; }
    setIsClosing(true);
    window.setTimeout(onClose, STICKER_EXIT_DURATION * 1000);
  };
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(76,51,61,0.3)] p-[0.7rem] backdrop-blur-[0.25rem] sm:items-center" onClick={closeDetail}>
    <div className="pc-detail-stage w-full max-w-[48rem]" onClick={(event) => event.stopPropagation()}>
    <motion.article layoutId={`pc-${character.id}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DETAIL_ENTER_DURATION }} className="pc-detail relative z-[1] w-full overflow-y-auto">
      <button className="pc-detail-close" type="button" onClick={closeDetail}>닫기</button>
      <div className="grid items-center gap-[1.4rem] sm:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="pc-polaroid"><button type="button" className="pc-polaroid-photo relative block aspect-square w-full cursor-zoom-in overflow-hidden" onClick={onShowOriginal} aria-label="원본 사진 보기"><Image src={character.portrait.cropped} alt={`${character.name}의 외형`} fill sizes="15rem" className="object-cover" /><div className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 0.8rem rgba(0,0,0,0.18)' }} /></button><div className="px-[0.2rem] pb-[1rem] pt-[0.55rem]">{character.alias && <p className="afterroll-meta text-[0.75rem] text-[var(--atr-muted)]">{character.alias}</p>}<p className="afterroll-title text-[1.6rem] text-[var(--atr-text)]">{character.name}</p>{character.catchphrase && <p className="afterroll-meta mt-[0.2rem] text-[0.75rem] text-[var(--atr-soft)]">“{character.catchphrase}”</p>}</div></div>
        <div><dl className="mt-[0.6rem] grid gap-x-[1rem] gap-y-[0.5rem] sm:grid-cols-2">{facts.map(([label, value]) => <div key={label}><dt className="pc-field-label">{label}</dt><dd className="afterroll-meta text-[0.84rem] text-[var(--atr-text)]" style={label === 'Color' && HEX_COLOR.test(value ?? '') ? { color: value } : undefined}>{value}</dd></div>)}</dl><CocDetails character={character} /><ShinobigamiDetails character={character} /><InsaneDetails character={character} />{character.personality && <div className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><p className="pc-field-label">{character.coc || character.shinobigami ? '설정' : '성격'}</p><p className="afterroll-body whitespace-pre-wrap text-[0.88rem] leading-[1.7] text-[var(--atr-muted)]">{character.personality}</p></div>}<div className="mt-[1rem] flex flex-wrap gap-[0.5rem]">{linkItems.map((link) => <a key={`${link.name}-${link.url}`} className="pc-link" href={link.url} target="_blank" rel="noreferrer">{link.name} ↗</a>)}{character.links.characterSheet && <a className="pc-link" href={character.links.characterSheet} target="_blank" rel="noreferrer">캐릭터 시트 ↗</a>}{character.links.commission && <a className="pc-link" href={character.links.commission} target="_blank" rel="noreferrer">커미션 ↗</a>}</div>{isAdmin && privateLinkItems.length > 0 && <div className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><p className="pc-field-label">비공개 링크</p><div className="mt-[0.45rem] flex flex-wrap gap-[0.5rem]">{privateLinkItems.map((link) => <a key={`${link.name}-${link.url}`} className="pc-link" href={link.url} target="_blank" rel="noreferrer">{link.name} ↗</a>)}</div></div>}<div className="mt-[1rem] border-t border-dashed border-[var(--atr-line)] pt-[0.8rem]"><p className="pc-field-label">연결된 세션</p>{sessions.length ? <ul className="mt-[0.4rem] space-y-[0.25rem]">{sessions.map((session) => <li key={session.id} className="afterroll-meta text-[0.78rem] text-[var(--atr-muted)]">{session.title} <span className="text-[var(--atr-soft)]">· {SESSION_STATUS_LABEL[session.status]}</span></li>)}</ul> : <p className="afterroll-meta mt-[0.4rem] text-[0.78rem] text-[var(--atr-soft)]">연결된 세션이 없습니다.</p>}</div></div>
      </div>
    </motion.article>
    {(character.stickers ?? []).map((sticker, index) => {
      const position = STICKER_POSITIONS[index % STICKER_POSITIONS.length];
      const size = sticker.size ?? DEFAULT_STICKER_SIZE;
      const style: CSSProperties & Record<'--pc-sticker-size' | '--pc-sticker-size-desktop' | '--pc-sticker-inset-x' | '--pc-sticker-inset-y', string> = {
        left: position.left,
        top: position.top,
        '--pc-sticker-size': `${STICKER_BASE_SIZE_COMPACT_REM * size}rem`,
        '--pc-sticker-size-desktop': `${STICKER_BASE_SIZE_DESKTOP_REM * size}rem`,
        '--pc-sticker-inset-x': position.compactInsetX,
        '--pc-sticker-inset-y': position.compactInsetY,
      };
      return <div key={sticker.src} className="pc-detail-sticker" style={style}><motion.div className="relative size-full" initial={{ opacity: 0, scale: 0.82, rotate: stickerRotation(character.id, index) - 4 }} animate={isClosing ? { opacity: 0, scale: 0.68 } : { opacity: 1, scale: 1, rotate: stickerRotation(character.id, index) }} transition={isClosing ? { duration: STICKER_EXIT_DURATION } : { duration: DETAIL_ENTER_DURATION, delay: STICKER_ENTER_DELAY + index * STICKER_STAGGER }}><Image src={sticker.src} alt="" fill sizes="(max-width: 40rem) 3.4rem, 5.2rem" className="object-contain" /></motion.div></div>;
    })}
    </div>
  </div>;
}

export default function CharactersSection({ characters }: { characters: Character[] }) {
  const [query, setQuery] = useState('');
  const [characterList, setCharacterList] = useState(characters);
  const [selected, setSelected] = useState<Character | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [plays, setPlays] = useState<PlayEntry[]>([]);
  useEffect(() => subscribeToPlays(setPlays), []);
  const sessionsByCharacter = useMemo(() => {
    const byId = new Map(plays.map((play) => [play.id, play]));
    return new Map(characterList.map((character) => [character.id, character.sessionKeys.flatMap((sessionKey) => {
      const session = byId.get(sessionKey);
      return session ? [session] : [];
    })]));
  }, [characterList, plays]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filteredCharacters = needle
      ? characterList.filter((character) => `${character.name} ${character.alias ?? ''}`.toLowerCase().includes(needle))
      : characterList;
    return [...filteredCharacters].sort((a, b) => compareCharactersBySessions(
      sessionsByCharacter.get(a.id) ?? [],
      sessionsByCharacter.get(b.id) ?? [],
    ));
  }, [characterList, query, sessionsByCharacter]);
  const updateSelected = (updated: Character) => { setCharacterList((current) => current.map((character) => character.id === updated.id ? updated : character)); setSelected(updated); };
  const deleteCharacterFromList = (id: string) => { setCharacterList((current) => current.filter((character) => character.id !== id)); setSelected((current) => current?.id === id ? null : current); };
  return <section className="pc-archive afterroll-desk mx-auto min-h-full max-w-[72rem] px-[1.1rem] py-[0.7rem] sm:py-[1.1rem] md:px-[2rem]"><header className="relative z-[1] mb-[1rem] flex flex-wrap items-center justify-between gap-[0.75rem] border-b border-[var(--atr-line)] pb-[0.85rem]"><div><p className="afterroll-meta text-[0.74rem] uppercase tracking-[0.14em] text-[var(--atr-soft)]">Character List</p><h1 className="afterroll-title mt-[0.18rem] text-[2.4rem] leading-none text-[var(--atr-text)]">캐릭터 목록</h1></div><CharacterUploadButton /></header><div className="relative z-[1] mb-[1.5rem] max-w-[22rem]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 별칭으로 찾기" className="pc-field" aria-label="캐릭터 검색" /></div>{visible.length ? <div className="relative z-[1] grid grid-cols-2 gap-x-[1rem] gap-y-[1.6rem] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map((character) => <Polaroid key={character.id} character={character} sessions={sessionsByCharacter.get(character.id) ?? []} onOpen={() => setSelected(character)} onUpdated={updateSelected} onDeleted={() => deleteCharacterFromList(character.id)} />)}</div> : <p className="relative z-[1] afterroll-meta py-[4rem] text-center text-[0.78rem] text-[var(--atr-muted)]">아직 보관된 캐릭터가 없습니다.</p>}<AnimatePresence>{selected && <CharacterDetail character={selected} sessions={sessionsByCharacter.get(selected.id) ?? []} onClose={() => setSelected(null)} onShowOriginal={() => setOriginalUrl(selected.portrait.original)} />}</AnimatePresence><AnimatePresence>{originalUrl && <motion.div key="lightbox" className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setOriginalUrl(null)}><motion.div className="relative h-[85vh] w-[85vw]" initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} transition={{ duration: 0.25 }}><Image src={originalUrl} alt="원본 사진" fill className="object-contain" /></motion.div></motion.div>}</AnimatePresence></section>;
}
