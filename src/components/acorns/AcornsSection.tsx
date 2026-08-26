'use client';

import { AnimatePresence, motion } from 'framer-motion';
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

type DisplayAcorn = Pick<AcornEntry, 'id' | 'title' | 'rule' | 'category' | 'role' | 'playerCount'> & {
  order: number;
  isSeed: boolean;
  source: AcornEntry | null;
};

const EMPTY_ACORN: AcornEntryInput = {
  title: '', rule: '', category: 'fanmade', role: 'PL', playerCount: '', participants: [],
};

const CATEGORY_LABEL: Record<AcornCategory, string> = { official: '공식', fanmade: '팬메이드' };
const ROLE_LABEL: Record<AcornRole, string> = { GM: 'GM', PL: 'PL', BOTH: '둘 다 가능' };
const CATEGORY_ORDER: AcornCategory[] = ['official', 'fanmade'];

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
      const data = { ...form, title: form.title.trim(), rule: form.rule.trim() };
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

function AcornList({ entries, isAdmin, onEdit, onDelete }: { entries: DisplayAcorn[]; isAdmin: boolean; onEdit: (entry: AcornEntry) => void; onDelete: (entry: DisplayAcorn) => void }) {
  return (
    <div className="border-t border-[rgba(172,151,110,0.24)]">
      {entries.map((entry) => (
        <motion.article
          layout
          key={entry.id}
          initial={{ opacity: 0, y: '0.45rem' }}
          animate={{ opacity: 1, y: 0 }}
          className="group flex items-center justify-between gap-[0.75rem] border-b border-[rgba(172,151,110,0.2)] py-[0.65rem] transition-colors hover:bg-[rgba(255,251,246,0.42)]"
        >
          <h3 className="afterroll-title min-w-0 text-[0.98rem] leading-tight text-[var(--ledger-ink)]">
            {entry.title}
          </h3>
          <div className="flex shrink-0 items-center gap-[0.35rem]">
            <span className="rounded-full bg-[rgba(232,169,186,0.16)] px-[0.45rem] py-[0.14rem] afterroll-meta text-[0.65rem] text-[var(--ledger-accent)]">
              {ROLE_LABEL[entry.role]}
            </span>
            <span className="rounded-full bg-[rgba(172,151,110,0.13)] px-[0.45rem] py-[0.14rem] afterroll-meta text-[0.65rem] text-[var(--ledger-muted)]">
              {entry.playerCount}
            </span>
            {isAdmin && (
              <span className="ml-[0.1rem] flex gap-[0.35rem] afterroll-meta text-[0.66rem] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {entry.source && <button onClick={() => onEdit(entry.source!)} className="text-[var(--ledger-muted)]">수정</button>}
                <button onClick={() => onDelete(entry)} className="text-[var(--ledger-accent)]">삭제</button>
              </span>
            )}
          </div>
        </motion.article>
      ))}
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

  const grouped = useMemo(() => {
    const entries: DisplayAcorn[] = isInitialized
      ? acorns.map((entry, order) => ({ ...entry, order, isSeed: false, source: entry }))
      : ACORN_SEED.map(toDisplaySeed);
    const rules = [...new Set(entries.map((entry) => entry.rule))].sort((a, b) => {
      const aIndex = ACORN_RULE_ORDER.indexOf(a); const bIndex = ACORN_RULE_ORDER.indexOf(b);
      if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? Infinity : aIndex) - (bIndex < 0 ? Infinity : bIndex);
      return a.localeCompare(b, 'ko');
    });
    return rules.map((rule) => ({ rule, categories: CATEGORY_ORDER.map((category) => ({ category, entries: entries.filter((entry) => entry.rule === rule && entry.category === category).sort((a, b) => a.order - b.order) })).filter((group) => group.entries.length) }));
  }, [acorns, isInitialized]);

  return <><div className="mb-[1.4rem] flex items-center justify-end gap-[0.45rem]">{isAdmin && !authLoading && <button onClick={() => setEditing(null)} className="rounded-[0.45rem] border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.16)] px-[0.8rem] py-[0.42rem] afterroll-meta text-[0.78rem] text-[var(--ledger-accent)]">+ 도토리 추가</button>}<AdminLoginButton /></div>{loading ? <p className="afterroll-meta text-[0.82rem] text-[var(--ledger-muted)]">목록을 불러오는 중…</p> : <div className="grid gap-[2rem]">{grouped.map(({ rule, categories }) => <section key={rule}><div className="mb-[0.75rem] flex items-center gap-[0.6rem]"><h2 className="afterroll-title text-[1.55rem] text-[var(--ledger-ink)]">{rule}</h2><span className="h-px flex-1 bg-[rgba(172,151,110,0.28)]" /></div><div className="grid gap-[1.1rem] md:grid-cols-2">{categories.map(({ category, entries }) => <div key={category}><p className="afterroll-meta mb-[0.45rem] text-[0.72rem] tracking-[0.08em] text-[var(--ledger-soft)]">{CATEGORY_LABEL[category]}</p><AcornList entries={entries} isAdmin={isAdmin} onEdit={setEditing} onDelete={(entry) => { if (!window.confirm('이 도토리를 삭제할까요?')) return; void (async () => { if (!isInitialized) await initializeSeedEntries(); await deleteAcorn(entry.id); })(); }} /></div>)}</div></section>)}</div>}<AnimatePresence>{editing !== undefined && <AcornForm entry={editing} options={options} onClose={() => setEditing(undefined)} />}</AnimatePresence></>;
}
