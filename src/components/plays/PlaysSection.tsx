'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import AdminLoginButton from '@/components/log/AdminLoginButton';
import {
  subscribeToPlays,
  subscribeToPlaysOptions,
  updatePlaysOptions,
  deletePlay,
  type PlayEntry,
  type PlaysOptions,
} from '@/lib/data/firebasePlays';
import PlaysComposer from './PlaysComposer';
import PlaysStats from './PlaysStats';

const CALENDAR_ID =
  '848efa2587af083c615b7c3581e818075a6489d1d0ce70c4ac3ef60880d0fbae%40group.calendar.google.com';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
}

export type TitleDates = { startDate: string; endDate: string | null };

function getEventDate(e: CalendarEvent): string {
  return (e.start.date ?? e.start.dateTime ?? '').slice(0, 10);
}

function buildTitleDatesMap(events: CalendarEvent[]): Map<string, TitleDates> {
  const raw = new Map<string, string[]>();
  for (const e of events) {
    const date = getEventDate(e);
    if (!date || !e.summary?.trim()) continue;
    const arr = raw.get(e.summary) ?? [];
    arr.push(date);
    raw.set(e.summary, arr);
  }
  const result = new Map<string, TitleDates>();
  for (const [title, dates] of raw) {
    const sorted = [...dates].sort();
    result.set(title, {
      startDate: sorted[0],
      endDate: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    });
  }
  return result;
}

function formatDate(d: string): string {
  return d.replace(/-/g, '.');
}

function getEntryDates(entry: PlayEntry, fallback: TitleDates | undefined): TitleDates | null {
  if (entry.startDate) return { startDate: entry.startDate, endDate: entry.endDate ?? null };
  return fallback ?? null;
}

function formatStart(dates: TitleDates | null): string {
  return dates ? formatDate(dates.startDate) : '—';
}

function formatEnd(entry: PlayEntry, dates: TitleDates | null): string {
  if (!dates) return '—';
  if (entry.status === 'ongoing') return '~';
  return formatDate(dates.endDate ?? dates.startDate);
}

const STATUS_LABEL: Record<PlayEntry['status'], string> = {
  completed: '완주',
  ongoing: '현행',
  dropped: '하차',
};

const STATUS_STYLE: Record<PlayEntry['status'], string> = {
  completed: 'bg-[rgba(70,150,70,0.12)] text-[rgba(40,110,40,0.85)] border-[rgba(70,150,70,0.28)]',
  ongoing: 'bg-[rgba(127,79,42,0.1)] text-[var(--ledger-accent)] border-[rgba(127,79,42,0.3)]',
  dropped: 'bg-[rgba(87,67,48,0.06)] text-[var(--ledger-muted)] border-[rgba(87,67,48,0.18)]',
};

const TH = 'px-[0.75rem] py-[0.55rem] text-left whitespace-nowrap';
const TD =
  'afterroll-meta px-[0.75rem] py-[0.5rem] text-[0.8rem] text-[var(--ledger-muted)] align-middle whitespace-nowrap';

function colCount(isAdmin: boolean) {
  return isAdmin ? 8 : 7;
}

// ── 클릭 가능한 컬럼 헤더 ────────────────────────────────────────
function ColHeader({
  col,
  label,
  openColumn,
  isActive,
  onOpen,
}: {
  col: string;
  label: string;
  openColumn: string | null;
  isActive: boolean;
  onOpen: (col: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      onClick={(e) => onOpen(col, e)}
      className={`afterroll-meta flex items-center gap-[0.22rem] text-[0.68rem] uppercase tracking-[0.06em] transition-colors ${
        isActive
          ? 'text-[var(--ledger-accent)]'
          : 'text-[var(--ledger-soft)] hover:text-[var(--ledger-ink)]'
      }`}
    >
      {label}
      <span
        className={`inline-block text-[0.52rem] transition-transform duration-150 ${
          openColumn === col ? 'rotate-180' : ''
        }`}
      >
        ▾
      </span>
      {isActive && (
        <span className="h-[0.28rem] w-[0.28rem] rounded-full bg-[var(--ledger-accent)]" />
      )}
    </button>
  );
}

export default function PlaysSection() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [plays, setPlays] = useState<PlayEntry[]>([]);
  const [options, setOptions] = useState<PlaysOptions>({
    rules: [],
    playerCounts: [],
    participants: [],
  });
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [playsLoading, setPlaysLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'stats'>('list');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlayEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 드롭다운
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // 필터
  const [filterStatus, setFilterStatus] = useState<PlayEntry['status'] | 'all'>('all');
  const [filterType, setFilterType] = useState<'GM' | 'PL' | 'all'>('all');
  const [filterRule, setFilterRule] = useState('all');
  const [filterPlayerCount, setFilterPlayerCount] = useState('all');
  const [filterTitleSearch, setFilterTitleSearch] = useState('');
  const [filterStartYear, setFilterStartYear] = useState('all');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const u1 = subscribeToPlays((entries) => { setPlays(entries); setPlaysLoading(false); });
    const u2 = subscribeToPlaysOptions(setOptions);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (playsLoading) return;
    const usedRules = new Set(plays.map((p) => p.rule).filter(Boolean));
    const usedPlayerCounts = new Set(plays.map((p) => p.playerCount).filter(Boolean));
    const usedParticipants = new Set(plays.flatMap((p) => p.participants));
    const cleanedRules = options.rules.filter((r) => usedRules.has(r));
    const cleanedPlayerCounts = options.playerCounts.filter((c) => usedPlayerCounts.has(c));
    const cleanedParticipants = options.participants.filter((p) => usedParticipants.has(p));
    const changed =
      cleanedRules.length !== options.rules.length ||
      cleanedPlayerCounts.length !== options.playerCounts.length ||
      cleanedParticipants.length !== options.participants.length;
    if (changed) {
      void updatePlaysOptions({
        rules: cleanedRules,
        playerCounts: cleanedPlayerCounts,
        participants: cleanedParticipants,
      });
    }
  }, [plays, options, playsLoading]);

  useEffect(() => {
    async function fetchAll() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
      if (!apiKey) { setCalLoading(false); return; }
      const timeMin = encodeURIComponent('2018-01-01T00:00:00Z');
      const timeMax = encodeURIComponent('2030-12-31T23:59:59Z');
      const all: CalendarEvent[] = [];
      let pageToken: string | undefined;
      try {
        do {
          const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
          const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=2500${tokenParam}`;
          const res = await fetch(url);
          if (!res.ok) break;
          const data = await res.json() as { items?: CalendarEvent[]; nextPageToken?: string };
          all.push(...(data.items ?? []));
          pageToken = data.nextPageToken;
        } while (pageToken);
      } catch { /* 조용히 실패 */ }
      setCalEvents(all);
      setCalLoading(false);
    }
    void fetchAll();
  }, []);

  const titleDatesMap = useMemo(() => buildTitleDatesMap(calEvents), [calEvents]);

  const calendarTitles = useMemo(() => {
    const registered = new Set(plays.map((p) => p.title));
    if (editTarget) registered.delete(editTarget.title);
    return [...new Set(calEvents.map((e) => e.summary).filter(Boolean))]
      .filter((t) => !registered.has(t))
      .sort();
  }, [calEvents, plays, editTarget]);

  const uniqueRules = useMemo(
    () => [...new Set(plays.map((p) => p.rule).filter(Boolean))].sort(),
    [plays],
  );
  const uniquePlayerCounts = useMemo(
    () =>
      [...new Set(plays.map((p) => p.playerCount).filter(Boolean))].sort(
        (a, b) => (parseInt(a) || 0) - (parseInt(b) || 0),
      ),
    [plays],
  );
  const uniqueStartYears = useMemo(() => {
    const years = new Set<string>();
    plays.forEach((p) => {
      const dates = getEntryDates(p, titleDatesMap.get(p.title));
      if (dates) years.add(dates.startDate.slice(0, 4));
    });
    return [...years].sort().reverse();
  }, [plays, titleDatesMap]);

  const filteredPlays = useMemo(() => {
    return plays.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (filterRule !== 'all' && p.rule !== filterRule) return false;
      if (filterPlayerCount !== 'all' && p.playerCount !== filterPlayerCount) return false;
      if (filterTitleSearch && !p.title.toLowerCase().includes(filterTitleSearch.toLowerCase()))
        return false;
      if (filterStartYear !== 'all') {
        const dates = getEntryDates(p, titleDatesMap.get(p.title));
        if (!dates || dates.startDate.slice(0, 4) !== filterStartYear) return false;
      }
      return true;
    });
  }, [plays, filterStatus, filterType, filterRule, filterPlayerCount, filterTitleSearch, filterStartYear, titleDatesMap]);

  function openFilter(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openColumn === col) { setOpenColumn(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setOpenColumn(col);
  }

  function closeFilter() { setOpenColumn(null); }

  function isFilterActive(col: string): boolean {
    if (col === 'status') return filterStatus !== 'all';
    if (col === 'type') return filterType !== 'all';
    if (col === 'rule') return filterRule !== 'all';
    if (col === 'playerCount') return filterPlayerCount !== 'all';
    if (col === 'title') return filterTitleSearch !== '';
    if (col === 'startYear') return filterStartYear !== 'all';
    return false;
  }

  function openAdd() { setEditTarget(null); setComposerOpen(true); }
  function openEdit(entry: PlayEntry) { setEditTarget(entry); setComposerOpen(true); }
  function closeComposer() { setComposerOpen(false); setEditTarget(null); }
  function toggleExpand(id: string) { setExpandedId((prev) => (prev === id ? null : id)); }

  const loading = authLoading || playsLoading || calLoading;

  // ── 드롭다운 콘텐츠 ───────────────────────────────────────────
  const ddClass =
    'min-w-[8rem] overflow-hidden rounded-[0.6rem] border border-[rgba(87,67,48,0.18)] bg-[#faf7ef] shadow-[0_4px_16px_rgba(87,67,48,0.14)]';
  const optCls = (active: boolean) =>
    `block w-full text-left px-[0.85rem] py-[0.42rem] afterroll-meta text-[0.82rem] transition-colors hover:bg-[rgba(127,79,42,0.08)] ${
      active ? 'bg-[rgba(127,79,42,0.05)] text-[var(--ledger-accent)]' : 'text-[var(--ledger-ink)]'
    }`;
  const divEl = <div className="border-b border-[rgba(87,67,48,0.08)]" />;

  function renderDropdown() {
    if (openColumn === 'startYear') {
      return (
        <div className={ddClass}>
          <button className={optCls(filterStartYear === 'all')} onClick={() => { setFilterStartYear('all'); closeFilter(); }}>전체</button>
          {uniqueStartYears.length > 0 && divEl}
          {uniqueStartYears.map((y) => (
            <button key={y} className={optCls(filterStartYear === y)} onClick={() => { setFilterStartYear(y); closeFilter(); }}>{y}</button>
          ))}
        </div>
      );
    }
    if (openColumn === 'rule') {
      return (
        <div className={ddClass}>
          <button className={optCls(filterRule === 'all')} onClick={() => { setFilterRule('all'); closeFilter(); }}>전체</button>
          {uniqueRules.length > 0 && divEl}
          {uniqueRules.map((r) => (
            <button key={r} className={optCls(filterRule === r)} onClick={() => { setFilterRule(r); closeFilter(); }}>{r}</button>
          ))}
        </div>
      );
    }
    if (openColumn === 'title') {
      return (
        <div className={`${ddClass} min-w-[11rem] p-[0.5rem]`}>
          <input
            autoFocus
            value={filterTitleSearch}
            onChange={(e) => setFilterTitleSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeFilter(); }}
            placeholder="이름 검색..."
            className="w-full afterroll-meta rounded-[0.4rem] border border-[rgba(87,67,48,0.2)] bg-[rgba(255,253,245,0.9)] px-[0.6rem] py-[0.38rem] text-[0.82rem] text-[var(--ledger-ink)] outline-none placeholder:text-[var(--ledger-muted)] focus:border-[var(--ledger-accent)]"
          />
          {filterTitleSearch && (
            <button
              className="mt-[0.3rem] w-full text-center afterroll-meta text-[0.72rem] text-[var(--ledger-muted)] hover:text-[var(--ledger-accent)]"
              onClick={() => { setFilterTitleSearch(''); closeFilter(); }}
            >
              초기화
            </button>
          )}
        </div>
      );
    }
    if (openColumn === 'playerCount') {
      return (
        <div className={ddClass}>
          <button className={optCls(filterPlayerCount === 'all')} onClick={() => { setFilterPlayerCount('all'); closeFilter(); }}>전체</button>
          {uniquePlayerCounts.length > 0 && divEl}
          {uniquePlayerCounts.map((c) => (
            <button key={c} className={optCls(filterPlayerCount === c)} onClick={() => { setFilterPlayerCount(c); closeFilter(); }}>{c}인</button>
          ))}
        </div>
      );
    }
    if (openColumn === 'type') {
      return (
        <div className={ddClass}>
          {(['all', 'PL', 'GM'] as const).map((v) => (
            <button key={v} className={optCls(filterType === v)} onClick={() => { setFilterType(v); closeFilter(); }}>
              {v === 'all' ? '전체' : v}
            </button>
          ))}
        </div>
      );
    }
    if (openColumn === 'status') {
      return (
        <div className={ddClass}>
          {([['all', '전체'], ['ongoing', '현행'], ['completed', '완주'], ['dropped', '하차']] as const).map(([v, l]) => (
            <button key={v} className={optCls(filterStatus === v)} onClick={() => { setFilterStatus(v); closeFilter(); }}>{l}</button>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      {/* 탭 + 로그인 */}
      <div className="mb-[1.2rem] flex items-center justify-between gap-[1rem]">
        <div className="flex gap-[0.4rem]">
          {(['list', 'stats'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`afterroll-meta rounded-[0.4rem] border px-[0.85rem] py-[0.35rem] text-[0.8rem] transition-all ${
                tab === t
                  ? 'border-[var(--ledger-accent)] bg-[rgba(127,79,42,0.08)] text-[var(--ledger-accent)]'
                  : 'border-[rgba(87,67,48,0.18)] text-[var(--ledger-muted)] hover:text-[var(--ledger-ink)]'
              }`}
            >
              {t === 'list' ? '목록' : '통계'}
            </button>
          ))}
        </div>
        <AdminLoginButton />
      </div>

      {tab === 'list' && isAdmin && !loading && (
        <div className="mb-[1rem]">
          <button
            onClick={openAdd}
            className="ledger-paper-panel ledger-dashed afterroll-note rounded-[0.5rem] px-[1rem] py-[0.42rem] text-[0.82rem] text-[var(--ledger-muted)] transition-all hover:text-[var(--ledger-ink)]"
          >
            + 새 플레이 추가
          </button>
        </div>
      )}

      {loading ? (
        <div className="ledger-paper-panel rounded-[0.8rem] p-[2rem] text-center afterroll-meta text-[var(--ledger-muted)]">
          불러오는 중...
        </div>
      ) : tab === 'list' ? (
        plays.length === 0 ? (
          <div className="ledger-paper-panel rounded-[0.8rem] p-[2rem] text-center afterroll-meta text-[var(--ledger-muted)]">
            아직 등록된 플레이가 없습니다.
          </div>
        ) : (
          <div className="ledger-paper-panel overflow-x-auto rounded-[0.8rem]">
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(87,67,48,0.12)]">
                  <th className={TH}>
                    <ColHeader col="startYear" label="시작" openColumn={openColumn} isActive={isFilterActive('startYear')} onOpen={openFilter} />
                  </th>
                  <th className={TH}>
                    <span className="afterroll-meta text-[0.68rem] uppercase tracking-[0.06em] text-[var(--ledger-soft)]">종료</span>
                  </th>
                  <th className={TH}>
                    <ColHeader col="rule" label="룰" openColumn={openColumn} isActive={isFilterActive('rule')} onOpen={openFilter} />
                  </th>
                  <th className={`${TH} w-full`}>
                    <ColHeader col="title" label="시나리오 이름" openColumn={openColumn} isActive={isFilterActive('title')} onOpen={openFilter} />
                  </th>
                  <th className={TH}>
                    <ColHeader col="playerCount" label="인원" openColumn={openColumn} isActive={isFilterActive('playerCount')} onOpen={openFilter} />
                  </th>
                  <th className={TH}>
                    <ColHeader col="type" label="유형" openColumn={openColumn} isActive={isFilterActive('type')} onOpen={openFilter} />
                  </th>
                  <th className={TH}>
                    <ColHeader col="status" label="상태" openColumn={openColumn} isActive={isFilterActive('status')} onOpen={openFilter} />
                  </th>
                  {isAdmin && <th className={TH} />}
                </tr>
              </thead>
              <tbody>
                {filteredPlays.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount(isAdmin)}
                      className="afterroll-meta px-[0.75rem] py-[1.5rem] text-center text-[0.82rem] text-[var(--ledger-muted)]"
                    >
                      해당 조건에 맞는 플레이가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPlays.map((entry, i) => {
                    const dates = getEntryDates(entry, titleDatesMap.get(entry.title));
                    const isExpanded = expandedId === entry.id;
                    const hasParticipants = entry.participants.length > 0;
                    return (
                      <Fragment key={entry.id}>
                        <tr
                          onClick={() => hasParticipants && toggleExpand(entry.id)}
                          className={`transition-colors ${i > 0 ? 'border-t border-[rgba(87,67,48,0.07)]' : ''} ${
                            hasParticipants
                              ? 'cursor-pointer hover:bg-[rgba(127,79,42,0.05)]'
                              : 'hover:bg-[rgba(127,79,42,0.02)]'
                          } ${isExpanded ? 'bg-[rgba(127,79,42,0.04)]' : ''}`}
                        >
                          <td className={TD}>{formatStart(dates)}</td>
                          <td className={TD}>{formatEnd(entry, dates)}</td>
                          <td className={TD}>{entry.rule || '—'}</td>
                          <td className={`${TD} afterroll-title text-[var(--ledger-ink)] whitespace-normal`}>
                            <span className="flex items-center gap-[0.35rem]">
                              {entry.title}
                              {hasParticipants && (
                                <span
                                  className={`text-[0.62rem] transition-transform duration-200 text-[var(--ledger-muted)] ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                >
                                  ▾
                                </span>
                              )}
                            </span>
                          </td>
                          <td className={TD}>{entry.playerCount ? `${entry.playerCount}인` : '—'}</td>
                          <td className={TD}>{entry.type}</td>
                          <td className={TD}>
                            <span className={`rounded-full border px-[0.45rem] py-[0.1rem] text-[0.67rem] ${STATUS_STYLE[entry.status]}`}>
                              {STATUS_LABEL[entry.status]}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className={`${TD} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                              {deletingId === entry.id ? (
                                <span className="flex items-center gap-[0.3rem]">
                                  <button
                                    onClick={async () => { await deletePlay(entry.id); setDeletingId(null); }}
                                    className="afterroll-meta rounded border border-[rgba(180,60,60,0.35)] px-[0.4rem] py-[0.18rem] text-[0.7rem] text-[rgba(160,50,50,0.85)] transition-all hover:bg-[rgba(180,60,60,0.08)]"
                                  >
                                    확인
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="afterroll-meta rounded border border-transparent px-[0.4rem] py-[0.18rem] text-[0.7rem] text-[var(--ledger-muted)] transition-all hover:text-[var(--ledger-ink)]"
                                  >
                                    취소
                                  </button>
                                </span>
                              ) : (
                                <span className="flex items-center gap-[0.3rem]">
                                  <button
                                    onClick={() => openEdit(entry)}
                                    className="afterroll-meta rounded border border-transparent px-[0.4rem] py-[0.18rem] text-[0.7rem] text-[var(--ledger-muted)] transition-all hover:border-[rgba(87,67,48,0.2)] hover:text-[var(--ledger-ink)]"
                                  >
                                    편집
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(entry.id)}
                                    className="afterroll-meta rounded border border-transparent px-[0.4rem] py-[0.18rem] text-[0.7rem] text-[var(--ledger-muted)] transition-all hover:border-[rgba(180,60,60,0.25)] hover:text-[rgba(160,50,50,0.8)]"
                                  >
                                    삭제
                                  </button>
                                </span>
                              )}
                            </td>
                          )}
                        </tr>

                        <AnimatePresence>
                          {isExpanded && hasParticipants && (
                            <tr
                              key={`${entry.id}-p`}
                              className="border-t border-[rgba(87,67,48,0.07)] bg-[rgba(127,79,42,0.03)]"
                            >
                              <td colSpan={colCount(isAdmin)} className="px-[0.75rem] py-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex flex-wrap gap-[0.3rem] py-[0.55rem]">
                                    <span className="afterroll-meta mr-[0.2rem] text-[0.7rem] text-[var(--ledger-soft)]">
                                      참여자
                                    </span>
                                    {entry.participants.map((p) => (
                                      <span
                                        key={p}
                                        className="afterroll-meta rounded-full border border-[rgba(87,67,48,0.15)] bg-[rgba(87,67,48,0.06)] px-[0.5rem] py-[0.1rem] text-[0.72rem] text-[var(--ledger-soft)]"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <PlaysStats plays={plays} titleDatesMap={titleDatesMap} />
      )}

      {/* 컬럼 필터 드롭다운 (portal) */}
      {mounted &&
        openColumn &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[998]" onClick={closeFilter} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                zIndex: 999,
              }}
            >
              {renderDropdown()}
            </motion.div>
          </>,
          document.body,
        )}

      <AnimatePresence>
        {composerOpen && (
          <PlaysComposer
            editTarget={editTarget}
            options={options}
            calendarTitles={calendarTitles}
            titleDatesMap={titleDatesMap}
            onClose={closeComposer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
