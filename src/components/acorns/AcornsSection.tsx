'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLoginButton from '@/components/log/AdminLoginButton';
import { ACORN_RULE_ORDER, ACORN_SEED, type SeedAcorn } from '@/lib/data/acornSeed';
import {
  addAcorn,
  deleteAcorn,
  initializeAcorns,
  subscribeToAcorns,
  subscribeToAcornInitialization,
  updateAcorn,
  type AcornCategory,
  type AcornEntry,
  type AcornEntryInput,
  type AcornRole,
} from '@/lib/data/firebaseAcorns';
import { subscribeToPlaysOptions, updatePlaysOptions, type PlaysOptions } from '@/lib/data/firebasePlays';

type DisplayAcorn = Pick<AcornEntry, 'id' | 'title' | 'rule' | 'category' | 'role' | 'playerCount' | 'link' | 'imageUrl'> & {
  order: number;
  isSeed: boolean;
  source: AcornEntry | null;
};

const EMPTY_ACORN: AcornEntryInput = {
  title: '', rule: '', category: 'fanmade', role: 'PL', playerCount: '', link: '', imageUrl: '', participants: [],
};

const CATEGORY_LABEL: Record<AcornCategory, string> = { official: '공식', fanmade: '팬메이드' };
const ROLE_LABEL: Record<AcornRole, string> = { GM: 'GM', PL: 'PL', BOTH: '둘 다 가능' };
const CATEGORY_ORDER: AcornCategory[] = ['official', 'fanmade'];
const ACORN_CARD_HOVER = { scale: 1.025, y: '-0.15rem' };
const ACORN_CARD_HOVER_TRANSITION = { type: 'spring', stiffness: 320, damping: 24, mass: 0.45 } as const;
const ROLE_ORDER: AcornRole[] = ['GM', 'PL', 'BOTH'];
const PLAYER_COUNT_ORDER = {
  taiman: Number.NEGATIVE_INFINITY,
  multi: Number.POSITIVE_INFINITY,
  unknown: Number.MAX_SAFE_INTEGER,
} as const;

function playerCountOrder(value: string) {
  const normalized = value.trim();
  if (normalized === '타이만') return PLAYER_COUNT_ORDER.taiman;
  if (normalized === '다인') return PLAYER_COUNT_ORDER.multi;
  const match = normalized.match(/^(\d+)인$/);
  return match ? Number.parseInt(match[1], 10) : PLAYER_COUNT_ORDER.unknown;
}

function roleOrder(value: AcornRole) {
  return ROLE_ORDER.indexOf(value);
}

function toDisplaySeed(entry: SeedAcorn): DisplayAcorn {
  return { ...entry, isSeed: true, source: null };
}

function AcornForm({ entry, options, onClose }: {
  entry: AcornEntry | null;
  options: PlaysOptions;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AcornEntryInput>(entry ?? EMPTY_ACORN);
  const [rules, setRules] = useState(options.rules);
  const [addingRule, setAddingRule] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [playerCounts, setPlayerCounts] = useState(options.playerCounts);
  const [addingPlayerCount, setAddingPlayerCount] = useState(false);
  const [newPlayerCount, setNewPlayerCount] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof AcornEntryInput>(key: K, value: AcornEntryInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function addRule() {
    const value = newRule.trim();
    if (!value) return;
    const next = rules.includes(value) ? rules : [...rules, value];
    setRules(next);
    setNewRule('');
    setAddingRule(false);
    set('rule', value);
    void updatePlaysOptions({ ...options, rules: next });
  }

  function addPlayerCount() {
    const value = newPlayerCount.trim();
    if (!value) return;
    const next = playerCounts.includes(value) ? playerCounts : [...playerCounts, value];
    setPlayerCounts(next);
    setNewPlayerCount('');
    setAddingPlayerCount(false);
    set('playerCount', value);
    void updatePlaysOptions({ ...options, playerCounts: next });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.rule.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        title: form.title.trim(),
        rule: form.rule.trim(),
        link: form.link?.trim() ?? '',
        imageUrl: form.imageUrl?.trim() ?? '',
      };
      if (entry) await updateAcorn(entry.id, data);
      else await addAcorn(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(76,51,61,0.3)] p-[1rem] backdrop-blur-sm">
      <motion.form initial={{ opacity: 0, y: '0.75rem' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '0.75rem' }} onSubmit={submit} className="ledger-paper-sheet max-h-[90vh] w-full max-w-[28rem] overflow-y-auto rounded-[1rem] p-[1.35rem]">
        <div className="mb-[1rem] flex items-center justify-between">
          <h2 className="afterroll-title text-[1.35rem] text-[var(--ledger-ink)]">{entry ? '도토리 수정' : '도토리 추가'}</h2>
          <button type="button" onClick={onClose} className="afterroll-meta text-[0.8rem] text-[var(--ledger-muted)]">닫기</button>
        </div>
        <div className="flex flex-col gap-[0.85rem]">
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">시나리오 이름
            <input required value={form.title} onChange={(event) => set('title', event.target.value)} className="mt-[0.35rem] w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">링크
            <input type="url" value={form.link ?? ''} onChange={(event) => set('link', event.target.value)} placeholder="https://" className="mt-[0.35rem] w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">이미지 주소
            <input type="url" value={form.imageUrl ?? ''} onChange={(event) => set('imageUrl', event.target.value)} placeholder="https://example.com/thumbnail.jpg" className="mt-[0.35rem] w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <div>
            <p className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">룰</p>
            <div className="flex flex-wrap gap-[0.35rem]">
              {rules.map((rule) => <button key={rule} type="button" onClick={() => set('rule', rule)} className={`rounded-full border px-[0.7rem] py-[0.28rem] text-[0.8rem] ${form.rule === rule ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{rule}</button>)}
              {addingRule ? <div className="flex items-center gap-[0.3rem]"><input autoFocus value={newRule} onChange={(event) => setNewRule(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addRule(); } if (event.key === 'Escape') { setNewRule(''); setAddingRule(false); } }} className="w-[6rem] rounded-full border border-[var(--ledger-accent)] bg-transparent px-[0.6rem] py-[0.26rem] text-[0.8rem] text-[var(--ledger-ink)] outline-none" /><button type="button" onClick={addRule} className="afterroll-meta text-[0.75rem] text-[var(--ledger-accent)]">추가</button><button type="button" onClick={() => { setNewRule(''); setAddingRule(false); }} className="afterroll-meta text-[0.75rem] text-[var(--ledger-muted)]">취소</button></div> : <button type="button" onClick={() => setAddingRule(true)} aria-label="새 룰 추가" className="rounded-full border border-dashed border-[rgba(200,121,147,0.26)] px-[0.7rem] py-[0.28rem] text-[0.8rem] text-[var(--ledger-muted)] transition-colors hover:border-[rgba(200,121,147,0.45)] hover:text-[var(--ledger-ink)]">+</button>}
            </div>
          </div>
          <fieldset><legend className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">종류</legend><div className="flex gap-[0.35rem]">{CATEGORY_ORDER.map((category) => <button key={category} type="button" onClick={() => set('category', category)} className={`rounded-full border px-[0.8rem] py-[0.28rem] text-[0.8rem] ${form.category === category ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{CATEGORY_LABEL[category]}</button>)}</div></fieldset>
          <fieldset><legend className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">역할</legend><div className="flex flex-wrap gap-[0.35rem]">{(Object.keys(ROLE_LABEL) as AcornRole[]).map((role) => <button key={role} type="button" onClick={() => set('role', role)} className={`rounded-full border px-[0.8rem] py-[0.28rem] text-[0.8rem] ${form.role === role ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{ROLE_LABEL[role]}</button>)}</div></fieldset>
          <div><p className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">인원 유형</p><div className="flex flex-wrap gap-[0.35rem]">{playerCounts.map((count) => <button key={count} type="button" onClick={() => set('playerCount', count)} className={`rounded-full border px-[0.7rem] py-[0.28rem] text-[0.8rem] ${form.playerCount === count ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{count}</button>)}{addingPlayerCount ? <div className="flex items-center gap-[0.3rem]"><input autoFocus value={newPlayerCount} onChange={(event) => setNewPlayerCount(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addPlayerCount(); } if (event.key === 'Escape') { setNewPlayerCount(''); setAddingPlayerCount(false); } }} className="w-[6rem] rounded-full border border-[var(--ledger-accent)] bg-transparent px-[0.6rem] py-[0.26rem] text-[0.8rem] text-[var(--ledger-ink)] outline-none" /><button type="button" onClick={addPlayerCount} className="afterroll-meta text-[0.75rem] text-[var(--ledger-accent)]">추가</button><button type="button" onClick={() => { setNewPlayerCount(''); setAddingPlayerCount(false); }} className="afterroll-meta text-[0.75rem] text-[var(--ledger-muted)]">취소</button></div> : <button type="button" onClick={() => setAddingPlayerCount(true)} aria-label="새 인원 유형 추가" className="rounded-full border border-dashed border-[rgba(200,121,147,0.26)] px-[0.7rem] py-[0.28rem] text-[0.8rem] text-[var(--ledger-muted)] transition-colors hover:border-[rgba(200,121,147,0.45)] hover:text-[var(--ledger-ink)]">+</button>}</div></div>
          <div className="flex justify-end gap-[0.5rem] border-t border-[rgba(200,121,147,0.18)] pt-[0.85rem]"><button type="button" onClick={onClose} className="afterroll-meta px-[0.8rem] py-[0.4rem] text-[0.82rem] text-[var(--ledger-muted)]">취소</button><button disabled={saving} className="rounded-[0.45rem] border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] px-[0.9rem] py-[0.4rem] afterroll-meta text-[0.82rem] text-[var(--ledger-accent)] disabled:opacity-40">{saving ? '저장 중…' : '저장'}</button></div>
        </div>
      </motion.form>
    </motion.div>
  );
}

function AcornThumbnail({ entry }: { entry: DisplayAcorn }) {
  const [hasLoadError, setHasLoadError] = useState(false);
  const imageUrl = entry.imageUrl?.trim();

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,rgba(231,194,202,0.88),rgba(249,238,235,0.94)_52%,rgba(211,169,180,0.7))]">
      {imageUrl && !hasLoadError ? <Image
        src={imageUrl}
        alt={`${entry.title} 썸네일`}
        width={384}
        height={288}
        sizes="(min-width: 48rem) 24rem, 100vw"
        unoptimized
        className="h-full w-full object-cover saturate-100 transition-[filter] duration-300 ease-out group-hover:saturate-[1.18] group-focus-within:saturate-[1.18]"
        onError={() => setHasLoadError(true)}
      /> : <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.72),transparent_27%),radial-gradient(circle_at_25%_78%,rgba(184,119,139,0.28),transparent_34%)]" />}
    </div>
  );
}

function AcornList({ entries, isAdmin, onEdit, onDelete }: { entries: DisplayAcorn[]; isAdmin: boolean; onEdit: (entry: AcornEntry) => void; onDelete: (entry: DisplayAcorn) => void }) {
  return (
    <div className="grid grid-cols-1 gap-[0.85rem] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => {
        const link = entry.link?.startsWith('https://') || entry.link?.startsWith('http://') ? entry.link : null;

        return (
        <motion.article
          layout
          key={entry.id}
          initial={{ opacity: 0, y: '0.45rem' }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={ACORN_CARD_HOVER}
          whileFocus={ACORN_CARD_HOVER}
          transition={ACORN_CARD_HOVER_TRANSITION}
          onClick={() => link && window.open(link, '_blank', 'noopener,noreferrer')}
          onKeyDown={(event) => {
            if (link && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              window.open(link, '_blank', 'noopener,noreferrer');
            }
          }}
          role={link ? 'link' : undefined}
          tabIndex={link ? 0 : undefined}
          className={`group relative overflow-hidden rounded-[0.7rem] border border-[rgba(200,121,147,0.25)] bg-[rgba(255,250,251,0.35)] shadow-[0_0.35rem_1rem_rgba(122,77,91,0.08)] transition-[border-color,box-shadow] duration-300 ease-out hover:z-10 hover:border-[rgba(200,121,147,0.48)] hover:shadow-[0_0.75rem_1.5rem_rgba(122,77,91,0.16)] focus-within:z-10 focus-within:border-[rgba(200,121,147,0.48)] focus-within:shadow-[0_0.75rem_1.5rem_rgba(122,77,91,0.16)]${link ? ' cursor-pointer will-change-transform focus-visible:outline focus-visible:outline-[0.12rem] focus-visible:outline-offset-[0.16rem] focus-visible:outline-[var(--ledger-accent)]' : ''}`}
        >
          <AcornThumbnail entry={entry} />
          <div className="absolute inset-x-[0.55rem] bottom-[0.55rem] rounded-[0.48rem] border border-[rgba(255,255,255,0.48)] bg-[rgba(255,248,250,0.68)] px-[0.65rem] py-[0.55rem] shadow-[0_0.25rem_0.8rem_rgba(98,57,70,0.1)] backdrop-blur-md transition-colors duration-300 group-hover:bg-[rgba(255,250,251,0.82)] group-focus-within:bg-[rgba(255,250,251,0.82)]">
            <h3 className="afterroll-title min-w-0 text-[1rem] leading-tight text-[var(--ledger-ink)]">{entry.title}</h3>
            <div className="mt-[0.38rem] flex flex-wrap items-center gap-x-[0.35rem] afterroll-meta text-[0.68rem] text-[var(--ledger-muted)]">
              <span>{ROLE_LABEL[entry.role]}</span>
              <span aria-hidden="true">·</span>
              <span>{entry.playerCount}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABEL[entry.category]}</span>
            {isAdmin && (
              <span className="ml-[0.1rem] flex gap-[0.35rem] afterroll-meta text-[0.66rem] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {entry.source && <button onClick={(event) => { event.stopPropagation(); onEdit(entry.source!); }} className="text-[var(--ledger-muted)]">수정</button>}
                <button onClick={(event) => { event.stopPropagation(); onDelete(entry); }} className="text-[var(--ledger-accent)]">삭제</button>
              </span>
            )}
            </div>
          </div>
        </motion.article>
      );
      })}
    </div>
  );
}

export default function AcornsSection() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [acorns, setAcorns] = useState<AcornEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [options, setOptions] = useState<PlaysOptions>({ rules: [], playerCounts: [], participants: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AcornEntry | null | undefined>(undefined);
  const [selectedRule, setSelectedRule] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<AcornCategory | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<AcornRole | 'all'>('all');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<string>('all');

  useEffect(() => subscribeToAcorns((items) => { setAcorns(items); setLoading(false); }), []);
  useEffect(() => subscribeToAcornInitialization(setIsInitialized), []);
  useEffect(() => subscribeToPlaysOptions(setOptions), []);

  async function initializeSeedEntries() {
    await initializeAcorns(ACORN_SEED.map((entry) => ({
      id: entry.id,
      title: entry.title,
      rule: entry.rule,
      category: entry.category,
      role: entry.role,
      playerCount: entry.playerCount,
      participants: [],
    })));
  }

  const entries = useMemo<DisplayAcorn[]>(() => (isInitialized
    ? acorns.map((entry, order) => ({ ...entry, order, isSeed: false, source: entry }))
    : ACORN_SEED.map(toDisplaySeed)), [acorns, isInitialized]);

  const rules = useMemo(() => [...new Set(entries.map((entry) => entry.rule))].sort((a, b) => {
      const aCount = entries.filter((entry) => entry.rule === a).length;
      const bCount = entries.filter((entry) => entry.rule === b).length;
      if (aCount !== bCount) return bCount - aCount;
      const aIndex = ACORN_RULE_ORDER.indexOf(a); const bIndex = ACORN_RULE_ORDER.indexOf(b);
      if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? Infinity : aIndex) - (bIndex < 0 ? Infinity : bIndex);
      return a.localeCompare(b, 'ko');
    }), [entries]);

  const playerCounts = useMemo(() => [...new Set(entries.map((entry) => entry.playerCount))]
    .sort((a, b) => playerCountOrder(a) - playerCountOrder(b) || a.localeCompare(b, 'ko')), [entries]);

  const grouped = useMemo(() => rules
    .filter((rule) => selectedRule === 'all' || rule === selectedRule)
    .map((rule) => ({
      rule,
      entries: entries.filter((entry) => entry.rule === rule
        && (selectedCategory === 'all' || entry.category === selectedCategory)
        && (selectedRole === 'all' || entry.role === selectedRole)
        && (selectedPlayerCount === 'all' || entry.playerCount === selectedPlayerCount))
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.order - b.order),
    }))
    .filter((group) => group.entries.length), [entries, rules, selectedCategory, selectedPlayerCount, selectedRole, selectedRule]);

  const deleteEntry = (entry: DisplayAcorn) => {
    if (!window.confirm('이 도토리를 삭제할까요?')) return;
    void (async () => {
      if (!isInitialized) await initializeSeedEntries();
      await deleteAcorn(entry.id);
    })();
  };

  return <>
    {loading ? <p className="afterroll-meta text-[0.82rem] text-[var(--ledger-muted)]">목록을 불러오는 중…</p> : <>
      <div className="mb-[1.6rem] flex flex-col gap-[0.7rem]">
        <div className="order-2 flex min-w-0 flex-1 flex-wrap items-center gap-[0.35rem] border-y border-[rgba(200,121,147,0.22)] py-[0.72rem] lg:flex-nowrap">
        <div className="flex shrink-0 flex-nowrap items-center gap-[0.35rem] whitespace-nowrap">
          <span className="mr-[0.15rem] afterroll-meta text-[0.68rem] tracking-[0.08em] text-[var(--ledger-soft)]">FILTER</span>
          <button type="button" aria-pressed={selectedRule === 'all'} onClick={() => setSelectedRule('all')} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedRule === 'all' ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>룰 전체</button>
          {rules.map((rule) => <button key={rule} type="button" aria-pressed={selectedRule === rule} onClick={() => setSelectedRule((current) => current === rule ? 'all' : rule)} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedRule === rule ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{rule}</button>)}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-[0.35rem] whitespace-nowrap border-l border-[rgba(200,121,147,0.28)] pl-[0.45rem]">
          {(['all', ...ROLE_ORDER] as const).map((role) => <button key={role} type="button" aria-pressed={selectedRole === role} onClick={() => setSelectedRole((current) => current === role ? 'all' : role)} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedRole === role ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{role === 'all' ? '역할 전체' : ROLE_LABEL[role]}</button>)}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-[0.35rem] whitespace-nowrap border-l border-[rgba(200,121,147,0.28)] pl-[0.45rem]">
          <button type="button" aria-pressed={selectedPlayerCount === 'all'} onClick={() => setSelectedPlayerCount('all')} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedPlayerCount === 'all' ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>인원 전체</button>
          {playerCounts.map((playerCount) => <button key={playerCount} type="button" aria-pressed={selectedPlayerCount === playerCount} onClick={() => setSelectedPlayerCount((current) => current === playerCount ? 'all' : playerCount)} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedPlayerCount === playerCount ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{playerCount}</button>)}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-[0.35rem] whitespace-nowrap border-l border-[rgba(200,121,147,0.28)] pl-[0.45rem]">
          <button type="button" aria-pressed={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedCategory === 'all' ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>분류 전체</button>
          {CATEGORY_ORDER.map((category) => <button key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory((current) => current === category ? 'all' : category)} className={`rounded-full border px-[0.58rem] py-[0.2rem] afterroll-meta text-[0.72rem] ${selectedCategory === category ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)]'}`}>{CATEGORY_LABEL[category]}</button>)}
        </div>
        </div>
        <div className="order-1 flex shrink-0 items-center justify-end gap-[0.45rem] self-end">
          {isAdmin && !authLoading && <button onClick={() => setEditing(null)} className="rounded-[0.45rem] border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.16)] px-[0.8rem] py-[0.42rem] afterroll-meta text-[0.78rem] text-[var(--ledger-accent)]">+ 도토리 추가</button>}
          <AdminLoginButton />
        </div>
      </div>
      {grouped.length ? <div className="grid gap-[1.65rem]">{grouped.map(({ rule, entries: ruleEntries }) => <section key={rule}><div className="mb-[0.48rem] flex items-baseline gap-[0.55rem]"><h2 className="afterroll-title text-[1.45rem] text-[var(--ledger-ink)]">{rule}</h2><span className="afterroll-meta text-[0.68rem] text-[var(--ledger-soft)]">{ruleEntries.length}개</span><span className="h-px flex-1 bg-[rgba(200,121,147,0.28)]" /></div><AcornList entries={ruleEntries} isAdmin={isAdmin} onEdit={setEditing} onDelete={deleteEntry} /></section>)}</div> : <p className="border-y border-[rgba(200,121,147,0.22)] py-[1.4rem] text-center afterroll-meta text-[0.8rem] text-[var(--ledger-muted)]">조건에 맞는 도토리가 없어요.</p>}
    </>}
    <AnimatePresence>{editing !== undefined && <AcornForm entry={editing} options={options} onClose={() => setEditing(undefined)} />}</AnimatePresence>
  </>;
}
