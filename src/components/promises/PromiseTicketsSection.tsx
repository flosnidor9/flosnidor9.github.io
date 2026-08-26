'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLoginButton from '@/components/log/AdminLoginButton';
import { subscribeToPlays, subscribeToPlaysOptions, updatePlaysOptions, type PlayEntry, type PlaysOptions } from '@/lib/data/firebasePlays';
import {
  addPromiseTicket,
  deletePromiseTicket,
  subscribeToPromiseTickets,
  updatePromiseTicket,
  type PromiseTicket,
  type PromiseTicketInput,
} from '@/lib/data/firebasePromises';

const EMPTY_TICKET: PromiseTicketInput = {
  scenarioName: '',
  rule: '',
  role: 'PL',
  participants: [],
  note: '',
  scenarioUrl: '',
  isCompleted: false,
  isPrivate: false,
};

const TICKET_HOVER_LIFT = '-0.55rem';
const TICKET_TILT_RANGE = 3;
const TICKET_TILT_OFFSET = TICKET_TILT_RANGE / 2;
const COMPLETED_STAMP_TILT_MIN = -16;
const COMPLETED_STAMP_TILT_MAX = 12;
const TICKET_HOVER_TRANSITION: Transition = { type: 'spring', stiffness: 360, damping: 22 };
const TICKET_PUNCH_COUNT = 9;
const TICKET_CORNER_INSET = 12;
const TICKET_PUNCH_DIAMETER = 6.333;
const TICKET_PUNCH_DEPTH = 3.2;
const TICKET_PUNCH_GAP = (100 - (TICKET_CORNER_INSET * 2) - (TICKET_PUNCH_COUNT * TICKET_PUNCH_DIAMETER)) / (TICKET_PUNCH_COUNT - 1);
const TICKET_TOP_EDGE = Array.from({ length: TICKET_PUNCH_COUNT }, (_, index) => (
  `q ${TICKET_PUNCH_DIAMETER / 2} ${TICKET_PUNCH_DEPTH} ${TICKET_PUNCH_DIAMETER} 0${index < TICKET_PUNCH_COUNT - 1 ? ` h ${TICKET_PUNCH_GAP}` : ''}`
)).join(' ');
const TICKET_BOTTOM_EDGE = Array.from({ length: TICKET_PUNCH_COUNT }, (_, index) => (
  `q -${TICKET_PUNCH_DIAMETER / 2} -${TICKET_PUNCH_DEPTH} -${TICKET_PUNCH_DIAMETER} 0${index < TICKET_PUNCH_COUNT - 1 ? ` h -${TICKET_PUNCH_GAP}` : ''}`
)).join(' ');
const TICKET_SHAPE_PATH = `M ${TICKET_CORNER_INSET} 0 ${TICKET_TOP_EDGE} Q ${100 - TICKET_CORNER_INSET} ${TICKET_CORNER_INSET} 100 ${TICKET_CORNER_INSET} V ${100 - TICKET_CORNER_INSET} Q ${100 - TICKET_CORNER_INSET} ${100 - TICKET_CORNER_INSET} ${100 - TICKET_CORNER_INSET} 100 ${TICKET_BOTTOM_EDGE} Q ${TICKET_CORNER_INSET} ${100 - TICKET_CORNER_INSET} 0 ${100 - TICKET_CORNER_INSET} V ${TICKET_CORNER_INSET} Q ${TICKET_CORNER_INSET} ${TICKET_CORNER_INSET} ${TICKET_CORNER_INSET} 0 Z`;

function getTicketTilt(ticketId: string) {
  const hash = [...ticketId].reduce((value, character) => ((value << 5) - value) + character.charCodeAt(0), 0);
  return (Math.abs(hash) % (TICKET_TILT_RANGE * 100)) / 100 - TICKET_TILT_OFFSET;
}

function getCompletedStampTilt(ticketId: string) {
  const hash = [...ticketId].reduce((value, character) => ((value << 5) - value) + character.charCodeAt(0), 0);
  const normalizedHash = (Math.abs(hash) % 10_000) / 10_000;
  return COMPLETED_STAMP_TILT_MIN + normalizedHash * (COMPLETED_STAMP_TILT_MAX - COMPLETED_STAMP_TILT_MIN);
}

function ParticipantsSearchField({
  selected,
  participants,
  playCounts,
  onToggle,
  onAddOption,
}: {
  selected: string[];
  participants: string[];
  playCounts: Map<string, number>;
  onToggle: (participant: string) => void;
  onAddOption: (participant: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const exactParticipant = useMemo(
    () => participants.find((participant) => participant.toLowerCase() === normalizedQuery),
    [normalizedQuery, participants],
  );
  const canAdd = Boolean(normalizedQuery) && !exactParticipant;
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return participants
      .filter((participant) => participant.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (playCounts.get(b) ?? 0) - (playCounts.get(a) ?? 0) || a.localeCompare(b, 'ko'))
      .slice(0, 8);
  }, [normalizedQuery, participants, playCounts]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function selectParticipant(participant: string) {
    onToggle(participant);
    setQuery('');
    setOpen(false);
  }

  function addParticipantFromQuery() {
    const participant = query.trim();
    if (!participant) return;
    onAddOption(participant);
    onToggle(participant);
    setQuery('');
    setOpen(false);
  }

  function commitQuery() {
    if (exactParticipant) {
      selectParticipant(exactParticipant);
      return;
    }
    addParticipantFromQuery();
  }

  return (
    <div ref={ref}>
      <p className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">참여자</p>
      {selected.length > 0 && <div className="mb-[0.45rem] flex flex-wrap gap-[0.35rem]">{selected.map((person) => <button key={person} type="button" onClick={() => onToggle(person)} className="rounded-full border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.2)] px-[0.65rem] py-[0.28rem] text-[0.78rem] text-[var(--ledger-accent)]">{person}<span className="ml-[0.35rem] opacity-70">{playCounts.get(person) ?? 0}회</span></button>)}</div>}
      <div className="relative">
        <input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitQuery(); } if (event.key === 'Escape') { setQuery(''); setOpen(false); } }} placeholder="참여자 검색 또는 추가..." className="w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none placeholder:text-[var(--ledger-muted)] focus:border-[var(--ledger-accent)]" />
        {open && normalizedQuery && <div className="absolute z-10 mt-[0.3rem] max-h-[13rem] w-full overflow-y-auto rounded-[0.5rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] shadow-[0_0.4rem_1rem_rgba(112,82,66,0.1)]">{matches.map((person) => <button key={person} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectParticipant(person)} className={`flex w-full items-center justify-between px-[0.8rem] py-[0.5rem] text-left transition-colors hover:bg-[rgba(232,169,186,0.15)] ${selected.includes(person) ? 'text-[var(--ledger-accent)]' : 'text-[var(--ledger-ink)]'}`}><span className="afterroll-meta text-[0.84rem]">{person}</span><span className="afterroll-meta text-[0.72rem] text-[var(--ledger-muted)]">같이 {playCounts.get(person) ?? 0}회</span></button>)}{canAdd && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addParticipantFromQuery} className="flex w-full items-center justify-between px-[0.8rem] py-[0.5rem] text-left transition-colors hover:bg-[rgba(232,169,186,0.15)]"><span className="afterroll-meta text-[0.84rem] text-[var(--ledger-ink)]">{query.trim()}</span><span className="afterroll-meta text-[0.72rem] text-[var(--ledger-accent)]">새로 추가</span></button>}{!matches.length && !canAdd && <p className="px-[0.8rem] py-[0.6rem] afterroll-meta text-[0.78rem] text-[var(--ledger-muted)]">일치하는 참여자가 없습니다.</p>}</div>}
      </div>
    </div>
  );
}

function SelectWithAdd({ value, options, onSelect, onAddOption }: {
  value: string;
  options: string[];
  onSelect: (rule: string) => void;
  onAddOption: (rule: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState('');
  function commit() {
    const rule = newRule.trim();
    if (rule) { onAddOption(rule); onSelect(rule); }
    setNewRule('');
    setAdding(false);
  }
  return <div><p className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">룰</p><div className="flex flex-wrap gap-[0.35rem]">{options.map((rule) => <button key={rule} type="button" onClick={() => onSelect(value === rule ? '' : rule)} className={`rounded-full border px-[0.7rem] py-[0.28rem] text-[0.8rem] transition-all ${value === rule ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)] hover:border-[rgba(200,121,147,0.42)] hover:text-[var(--ledger-ink)]'}`}>{rule}</button>)}{adding ? <div className="flex items-center gap-[0.3rem]"><input autoFocus value={newRule} onChange={(event) => setNewRule(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } if (event.key === 'Escape') setAdding(false); }} className="w-[6rem] rounded-full border border-[var(--ledger-accent)] bg-transparent px-[0.6rem] py-[0.26rem] text-[0.8rem] text-[var(--ledger-ink)] outline-none" /><button type="button" onClick={commit} className="text-[0.75rem] text-[var(--ledger-accent)]">추가</button><button type="button" onClick={() => { setNewRule(''); setAdding(false); }} className="text-[0.75rem] text-[var(--ledger-muted)]">취소</button></div> : <button type="button" onClick={() => setAdding(true)} className="rounded-full border border-dashed border-[rgba(200,121,147,0.26)] px-[0.7rem] py-[0.28rem] text-[0.8rem] text-[var(--ledger-muted)] transition-all hover:border-[rgba(200,121,147,0.45)] hover:text-[var(--ledger-ink)]">+</button>}</div></div>;
}

function TicketForm({ ticket, participants, rules, playCounts, onAddRule, onAddParticipant, onClose }: {
  ticket: PromiseTicket | null;
  participants: string[];
  rules: string[];
  playCounts: Map<string, number>;
  onAddRule: (rule: string) => void;
  onAddParticipant: (participant: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PromiseTicketInput>(ticket ?? EMPTY_TICKET);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PromiseTicketInput>(key: K, value: PromiseTicketInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.scenarioName.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, scenarioName: form.scenarioName.trim(), note: form.note.trim(), scenarioUrl: form.scenarioUrl.trim() };
      if (ticket) await updatePromiseTicket(ticket, data);
      else await addPromiseTicket(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '0.75rem' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '0.75rem' }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(76,51,61,0.3)] p-[1rem] backdrop-blur-sm"
    >
      <form onSubmit={submit} className="ledger-paper-sheet max-h-[90vh] w-full max-w-[30rem] overflow-y-auto rounded-[1rem] p-[1.35rem]">
        <div className="mb-[1rem] flex items-center justify-between">
          <h2 className="afterroll-title text-[1.35rem] text-[var(--ledger-ink)]">{ticket ? '공수표 수정' : '새 공수표'}</h2>
          <button type="button" onClick={onClose} className="afterroll-meta text-[0.8rem] text-[var(--ledger-muted)]">닫기</button>
        </div>
        <div className="flex flex-col gap-[0.85rem]">
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">시나리오 이름
            <input required value={form.scenarioName} onChange={(e) => set('scenarioName', e.target.value)} className="mt-[0.35rem] w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <SelectWithAdd value={form.rule} options={rules} onSelect={(rule) => set('rule', rule)} onAddOption={onAddRule} />
          <fieldset>
            <legend className="afterroll-meta mb-[0.4rem] text-[0.75rem] text-[var(--ledger-soft)]">역할</legend>
            <div className="flex gap-[0.35rem]">
              {(['PL', 'GM'] as const).map((role) => <button key={role} type="button" onClick={() => set('role', role)} className={`rounded-full border px-[0.8rem] py-[0.28rem] text-[0.8rem] transition-all ${form.role === role ? 'border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.22)] text-[var(--ledger-accent)]' : 'border-[rgba(200,121,147,0.22)] text-[var(--ledger-muted)] hover:border-[rgba(200,121,147,0.42)] hover:text-[var(--ledger-ink)]'}`}>{role}</button>)}
            </div>
          </fieldset>
          <ParticipantsSearchField selected={form.participants} participants={participants} playCounts={playCounts} onToggle={(person) => set('participants', form.participants.includes(person) ? form.participants.filter((item) => item !== person) : [...form.participants, person])} onAddOption={onAddParticipant} />
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">메모
            <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} className="mt-[0.35rem] w-full resize-y rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <label className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">시나리오 링크
            <input type="url" value={form.scenarioUrl} onChange={(e) => set('scenarioUrl', e.target.value)} placeholder="https://" className="mt-[0.35rem] w-full rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)]" />
          </label>
          <label className="flex items-center gap-[0.5rem] afterroll-meta text-[0.8rem] text-[var(--ledger-muted)]"><input type="checkbox" checked={form.isCompleted} onChange={(e) => set('isCompleted', e.target.checked)} /> 완료됨</label>
          <label className="flex items-center gap-[0.5rem] afterroll-meta text-[0.8rem] text-[var(--ledger-muted)]"><input type="checkbox" checked={form.isPrivate} onChange={(e) => set('isPrivate', e.target.checked)} /> 비공개 (수정 권한 보유자만 볼 수 있음)</label>
          <div className="flex justify-end gap-[0.5rem] border-t border-[rgba(200,121,147,0.18)] pt-[0.85rem]">
            <button type="button" onClick={onClose} className="afterroll-meta px-[0.8rem] py-[0.4rem] text-[0.82rem] text-[var(--ledger-muted)]">취소</button>
            <button disabled={saving} className="rounded-[0.45rem] border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.18)] px-[0.9rem] py-[0.4rem] afterroll-meta text-[0.82rem] text-[var(--ledger-accent)] disabled:opacity-40">{saving ? '저장 중...' : '저장'}</button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

function Ticket({ ticket, canEdit, onEdit, onDelete }: { ticket: PromiseTicket; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const scenarioUrl = ticket.scenarioUrl.startsWith('https://') || ticket.scenarioUrl.startsWith('http://')
    ? ticket.scenarioUrl
    : null;
  const shapeId = `promise-ticket-${ticket.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hoverTilt = getTicketTilt(ticket.id);
  const completedStampTilt = getCompletedStampTilt(ticket.id);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: '0.75rem' }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: TICKET_HOVER_LIFT, rotate: hoverTilt }}
      transition={TICKET_HOVER_TRANSITION}
      className="promise-ticket-shadow"
    >
    <article className={ticket.isCompleted ? 'promise-ticket promise-ticket--completed' : 'promise-ticket'}>
      <svg className="promise-ticket__shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id={`${shapeId}-shadow`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#753148" floodOpacity="0.36" /></filter>
          <mask id={shapeId}><path fill="white" d={TICKET_SHAPE_PATH} /></mask>
        </defs>
        <rect width="100" height="100" fill={ticket.isCompleted ? '#dec5cc' : '#f5c9d7'} mask={`url(#${shapeId})`} filter={`url(#${shapeId}-shadow)`} />
      </svg>
      {ticket.isCompleted && <span className="promise-ticket__completed-stamp" style={{ '--completed-stamp-tilt': `${completedStampTilt}deg` } as CSSProperties} aria-label="완료된 공수표">사용 완료</span>}
      <div className="promise-ticket__main">
          <div className="relative z-10 flex h-full flex-col p-[0.85rem] pb-[1.65rem] text-center">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="w-full"><p className="afterroll-meta text-[0.58rem] uppercase tracking-[0.12em] text-[var(--atr-accent)]">{ticket.rule || 'RULE 미정'} {ticket.role ? `· ${ticket.role}` : ''}</p><h2 className="afterroll-title mt-[0.2rem] text-[1.1rem] leading-tight text-[var(--ledger-ink)]">{ticket.scenarioName}</h2>{ticket.isPrivate && <span className="mt-[0.35rem] inline-block rounded-full border border-[rgba(200,121,147,0.35)] px-[0.4rem] py-[0.15rem] afterroll-meta text-[0.55rem] text-[var(--ledger-muted)]">비공개</span>}</div>
            {ticket.participants.length > 0 && <div className="mt-[0.65rem] flex flex-wrap justify-center gap-[0.25rem]">{ticket.participants.map((person) => <span key={person} className="rounded-full bg-[rgba(232,169,186,0.22)] px-[0.42rem] py-[0.16rem] afterroll-meta text-[0.62rem] text-[var(--ledger-muted)]">{person}</span>)}</div>}
            {ticket.note && <p className="mt-[0.6rem] whitespace-pre-wrap text-center afterroll-meta text-[0.7rem] leading-relaxed text-[var(--ledger-muted)]">{ticket.note}</p>}
          </div>
          <div className="mt-[0.7rem] flex w-full shrink-0 flex-col items-center gap-[0.4rem] border-t border-dashed border-[rgba(200,121,147,0.34)] pt-[0.5rem]">{scenarioUrl && <a href={scenarioUrl} target="_blank" rel="noreferrer" className="afterroll-meta text-[0.65rem] text-[var(--atr-accent)] underline decoration-[rgba(200,121,147,0.4)] underline-offset-[0.2rem]">시나리오 보러가기</a>}{canEdit && <span className="flex justify-center gap-[0.45rem]"><button onClick={onEdit} className="afterroll-meta text-[0.65rem] text-[var(--ledger-muted)]">수정</button><button onClick={onDelete} className="afterroll-meta text-[0.65rem] text-[var(--ledger-accent)]">삭제</button></span>}</div>
        </div>
      </div>
    </article>
    </motion.div>
  );
}

export default function PromiseTicketsSection() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [publicTickets, setPublicTickets] = useState<PromiseTicket[]>([]);
  const [privateTickets, setPrivateTickets] = useState<PromiseTicket[]>([]);
  const [plays, setPlays] = useState<PlayEntry[]>([]);
  const [options, setOptions] = useState<PlaysOptions>({ rules: [], playerCounts: [], participants: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromiseTicket | null | undefined>(undefined);
  const [nicknameQuery, setNicknameQuery] = useState('');

  useEffect(() => subscribeToPlaysOptions(setOptions), []);
  useEffect(() => subscribeToPlays(setPlays), []);
  useEffect(() => {
    const stopPublic = subscribeToPromiseTickets(false, (items) => { setPublicTickets(items); setLoading(false); });
    const stopPrivate = isAdmin ? subscribeToPromiseTickets(true, setPrivateTickets) : undefined;
    return () => { stopPublic(); stopPrivate?.(); };
  }, [isAdmin]);

  const ordered = useMemo(() => {
    const normalizedQuery = nicknameQuery.trim().toLocaleLowerCase('ko');
    return [...publicTickets, ...(isAdmin ? privateTickets : [])]
      .filter((ticket) => !normalizedQuery || ticket.participants.some((participant) => participant.toLocaleLowerCase('ko').includes(normalizedQuery)))
      .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.());
  }, [isAdmin, nicknameQuery, privateTickets, publicTickets]);
  const playCounts = useMemo(() => {
    const counts = new Map<string, number>();
    plays.forEach((play) => play.participants.forEach((participant) => counts.set(participant, (counts.get(participant) ?? 0) + 1)));
    return counts;
  }, [plays]);
  const addRule = (rule: string) => {
    if (options.rules.includes(rule)) return;
    void updatePlaysOptions({ ...options, rules: [...options.rules, rule] });
  };
  const addParticipant = (participant: string) => {
    if (options.participants.includes(participant)) return;
    void updatePlaysOptions({ ...options, participants: [...options.participants, participant] });
  };
  return <>
    <div className="mb-[1.25rem] flex flex-col gap-[0.8rem] sm:flex-row sm:items-end sm:justify-between">
      <div className="flex-1">
        <p className="afterroll-meta text-[0.75rem] text-[var(--ledger-soft)]">본인의 닉네임을 입력하면 공수표가 보입니다.</p>
        <input value={nicknameQuery} onChange={(event) => setNicknameQuery(event.target.value)} aria-label="닉네임 검색" placeholder="닉네임 검색" className="mt-[0.35rem] block w-full max-w-[24rem] rounded-[0.45rem] border border-[rgba(200,121,147,0.24)] bg-[#fff8fa] px-[0.7rem] py-[0.5rem] text-[0.9rem] text-[var(--ledger-ink)] outline-none placeholder:text-[var(--ledger-muted)] focus:border-[var(--ledger-accent)]" />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-[0.45rem]">
        {isAdmin && !authLoading && <button onClick={() => setEditing(null)} className="rounded-[0.45rem] border border-[var(--ledger-accent)] bg-[rgba(232,169,186,0.16)] px-[0.8rem] py-[0.42rem] afterroll-meta text-[0.78rem] text-[var(--ledger-accent)]">+ 공수표 추가</button>}
        <AdminLoginButton />
      </div>
    </div>
    {authLoading || loading ? <p className="afterroll-meta text-[0.82rem] text-[var(--ledger-muted)]">티켓을 불러오는 중...</p> : ordered.length ? <div className="grid justify-start gap-[0.8rem] [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),11.5rem))]">{ordered.map((ticket) => <Ticket key={`${ticket.isPrivate}-${ticket.id}`} ticket={ticket} canEdit={isAdmin} onEdit={() => setEditing(ticket)} onDelete={() => { if (window.confirm('이 공수표를 삭제할까요?')) void deletePromiseTicket(ticket); }} />)}</div> : <div className="rounded-[0.9rem] border border-dashed border-[rgba(172,151,110,0.38)] p-[2rem] text-center afterroll-meta text-[0.84rem] text-[var(--ledger-muted)]">{nicknameQuery.trim() ? '해당 닉네임의 공수표가 없습니다.' : '아직 발행된 공수표가 없습니다.'}</div>}
    <AnimatePresence>{editing !== undefined && <TicketForm ticket={editing} participants={options.participants} rules={options.rules} playCounts={playCounts} onAddRule={addRule} onAddParticipant={addParticipant} onClose={() => setEditing(undefined)} />}</AnimatePresence>
  </>;
}
