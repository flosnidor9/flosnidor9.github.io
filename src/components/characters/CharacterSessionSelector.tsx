'use client';

import { useEffect, useMemo, useState } from 'react';
import { subscribeToPlays, type PlayEntry } from '@/lib/data/firebasePlays';

type Props = { value: string[]; onChange: (sessionKeys: string[]) => void };

function sessionLabel(session: PlayEntry) {
  return [session.title, session.rule, session.startDate].filter(Boolean).join(' · ');
}

export default function CharacterSessionSelector({ value, onChange }: Props) {
  const [sessions, setSessions] = useState<PlayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => subscribeToPlays((entries) => {
    setSessions(entries);
    setLoading(false);
  }), []);

  const selectedKeys = useMemo(() => new Set(value), [value]);
  const unavailableKeys = value.filter((key) => !sessions.some((session) => session.id === key));
  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ko-KR');
    if (!needle) return sessions;
    return sessions.filter((session) =>
      sessionLabel(session).toLocaleLowerCase('ko-KR').includes(needle),
    );
  }, [query, sessions]);
  const toggle = (id: string) => onChange(selectedKeys.has(id) ? value.filter((key) => key !== id) : [...value, id]);

  return <section aria-labelledby="character-session-label">
    <div className="mb-[0.45rem] flex items-baseline justify-between gap-[0.75rem]">
      <p id="character-session-label" className="pc-field-label mb-0">연결할 세션</p>
      <span className="afterroll-meta text-[0.7rem] text-[var(--atr-soft)]">{value.length}개 선택됨</span>
    </div>
    {loading ? <p className="afterroll-meta text-[0.72rem] text-[var(--atr-soft)]">세션 목록을 불러오는 중…</p> : sessions.length ? <>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="pc-field mb-[0.45rem]"
        placeholder="세션 제목, 룰, 날짜로 검색"
        aria-label="연결할 세션 검색"
      />
      <div className="max-h-[13rem] space-y-[0.35rem] overflow-y-auto rounded-[0.45rem] border border-[var(--atr-line)] bg-[rgba(255,248,250,0.42)] p-[0.45rem]">
      {filteredSessions.map((session) => <label key={session.id} className="flex cursor-pointer items-center gap-[0.55rem] rounded-[0.3rem] px-[0.4rem] py-[0.35rem] hover:bg-[rgba(232,169,186,0.12)]">
        <input type="checkbox" checked={selectedKeys.has(session.id)} onChange={() => toggle(session.id)} className="size-[0.9rem] accent-[var(--ledger-accent)]" />
        <span className="afterroll-meta min-w-0 text-[0.78rem] text-[var(--atr-muted)]">{sessionLabel(session)}</span>
      </label>)}
      {filteredSessions.length === 0 && <p className="afterroll-meta px-[0.4rem] py-[0.6rem] text-[0.72rem] text-[var(--atr-soft)]">검색 결과가 없습니다.</p>}
      </div>
    </> : <p className="afterroll-meta text-[0.72rem] text-[var(--atr-soft)]">등록된 세션이 없습니다. 플레이 목록에서 세션을 먼저 등록해 주세요.</p>}
    {unavailableKeys.length > 0 && <div className="mt-[0.45rem] flex flex-wrap items-center gap-[0.35rem]">
      <span className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">목록에 없는 기존 연결:</span>
      {unavailableKeys.map((key) => <button key={key} type="button" className="afterroll-meta rounded-full border border-[var(--atr-line)] px-[0.45rem] py-[0.12rem] text-[0.68rem] text-[var(--atr-muted)]" onClick={() => onChange(value.filter((sessionKey) => sessionKey !== key))} aria-label={`${key} 연결 해제`}>{key} ×</button>)}
    </div>}
  </section>;
}
