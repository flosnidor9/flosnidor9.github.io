'use client';

import { useState } from 'react';
import type { PlayEntry } from '@/lib/data/firebasePlays';

type TitleDates = { startDate: string; endDate: string | null };

const STATUS_LABEL = { completed: '완주', ongoing: '진행', dropped: '하차' } as const;

interface Props {
  plays: PlayEntry[];
  titleDatesMap: Map<string, TitleDates>;
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ledger-paper-panel rounded-[0.45rem] px-[1.2rem] py-[1rem]">
      <p className="afterroll-meta mb-[0.8rem] text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ledger-soft)]">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function PlaysStats({ plays, titleDatesMap }: Props) {
  const [participantSearch, setParticipantSearch] = useState('');

  const ruleCounts: Record<string, number> = {};
  plays.forEach((p) => {
    if (p.rule) ruleCounts[p.rule] = (ruleCounts[p.rule] ?? 0) + 1;
  });
  const ruleEntries = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);

  const pcCounts: Record<string, number> = {};
  plays.forEach((p) => {
    if (p.playerCount) pcCounts[p.playerCount] = (pcCounts[p.playerCount] ?? 0) + 1;
  });
  const pcEntries = Object.entries(pcCounts).sort((a, b) => {
    const na = parseInt(a[0], 10) || 0;
    const nb = parseInt(b[0], 10) || 0;
    return na - nb;
  });

  const statusCounts = { completed: 0, ongoing: 0, dropped: 0 };
  plays.forEach((p) => {
    statusCounts[p.status] += 1;
  });

  const searchTerm = participantSearch.trim();
  const matchedPlays = searchTerm
    ? plays.filter((p) => p.participants.some((x) => x.includes(searchTerm)))
    : [];

  const yearCounts: Record<string, number> = {};
  const monthCounts: Record<string, number> = {};
  plays.forEach((p) => {
    const sd = p.startDate || titleDatesMap.get(p.title)?.startDate;
    if (!sd) return;
    const year = sd.slice(0, 4);
    const month = sd.slice(0, 7);
    yearCounts[year] = (yearCounts[year] ?? 0) + 1;
    monthCounts[month] = (monthCounts[month] ?? 0) + 1;
  });
  const yearEntries = Object.entries(yearCounts).sort((a, b) => b[0].localeCompare(a[0]));
  const monthEntries = Object.entries(monthCounts).sort((a, b) => b[0].localeCompare(a[0]));

  if (plays.length === 0) {
    return (
      <div className="ledger-paper-panel rounded-[0.45rem] p-[2rem] text-center afterroll-meta text-[var(--ledger-muted)]">
        등록된 플레이 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[0.8rem]">
      <StatCard label="상태 기록">
        <div className="flex flex-wrap gap-[1.8rem]">
          {(['ongoing', 'completed', 'dropped'] as const).map((s) => (
            <div key={s} className="text-center">
              <div className="afterroll-title text-[2rem] leading-none text-[var(--ledger-ink)]">
                {statusCounts[s]}
              </div>
              <div className="afterroll-meta mt-[0.3rem] text-[0.72rem] text-[var(--ledger-muted)]">
                {STATUS_LABEL[s]}
              </div>
            </div>
          ))}
          <div className="text-center">
            <div className="afterroll-title text-[2rem] leading-none text-[var(--ledger-ink)]">
              {plays.length}
            </div>
            <div className="afterroll-meta mt-[0.3rem] text-[0.72rem] text-[var(--ledger-muted)]">전체</div>
          </div>
        </div>
      </StatCard>

      {ruleEntries.length > 0 && (
        <StatCard label="룰 빈도">
          <div className="flex flex-col gap-[0.4rem]">
            {ruleEntries.map(([rule, count]) => (
              <div key={rule} className="flex items-center gap-[0.6rem]">
                <span className="afterroll-meta w-[6rem] shrink-0 text-[0.85rem] text-[var(--ledger-ink)]">
                  {rule}
                </span>
                <div className="h-[0.28rem] flex-1 overflow-hidden rounded-full bg-[rgba(88, 125, 163,0.1)]">
                  <div
                    className="h-full rounded-full bg-[var(--ledger-accent)]"
                    style={{ width: `${(count / plays.length) * 100}%`, opacity: 0.6 }}
                  />
                </div>
                <span className="afterroll-meta w-[2.5rem] text-right text-[0.8rem] text-[var(--ledger-muted)]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {pcEntries.length > 0 && (
        <StatCard label="인원수">
          <div className="flex flex-wrap gap-[0.5rem]">
            {pcEntries.map(([pc, count]) => (
              <div
                key={pc}
                className="rounded-[0.3rem] border border-[var(--atr-line)] bg-[rgba(88, 125, 163,0.05)] px-[0.9rem] py-[0.55rem] text-center"
              >
                <div className="afterroll-title text-[1.4rem] leading-none text-[var(--ledger-ink)]">{count}</div>
                <div className="afterroll-meta mt-[0.2rem] text-[0.7rem] text-[var(--ledger-muted)]">{pc}P</div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      <StatCard label="참여자 검색">
        <input
          value={participantSearch}
          onChange={(e) => setParticipantSearch(e.target.value)}
          placeholder="참여자 검색..."
          className="w-full rounded-[0.3rem] border border-[var(--atr-line)] bg-white px-[0.7rem] py-[0.42rem] afterroll-meta text-[0.85rem] text-[var(--ledger-ink)] outline-none transition-colors placeholder:text-[var(--ledger-muted)] focus:border-[var(--ledger-accent)]"
        />
        {searchTerm && (
          <div className="mt-[0.7rem]">
            <p className="afterroll-meta mb-[0.4rem] text-[0.82rem] text-[var(--ledger-muted)]">
              <span className="text-[var(--ledger-ink)]">{'"'}{searchTerm}{'"'}</span> 일치 기록:{' '}
              <span className="text-[var(--ledger-accent)]">{matchedPlays.length}</span>
            </p>
            <div className="flex flex-col gap-[0.2rem]">
              {matchedPlays.map((p) => (
                <div key={p.id} className="afterroll-meta text-[0.78rem] text-[var(--ledger-muted)]">
                  - {p.title}
                  <span className="ml-[0.4rem] text-[var(--ledger-soft)]">({STATUS_LABEL[p.status]})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </StatCard>

      {yearEntries.length > 0 && (
        <StatCard label="연도 기록">
          <div className="flex flex-wrap gap-[0.5rem]">
            {yearEntries.map(([year, count]) => (
              <div
                key={year}
                className="rounded-[0.3rem] border border-[var(--atr-line)] bg-[rgba(88, 125, 163,0.05)] px-[0.9rem] py-[0.55rem] text-center"
              >
                <div className="afterroll-title text-[1.4rem] leading-none text-[var(--ledger-ink)]">{count}</div>
                <div className="afterroll-meta mt-[0.2rem] text-[0.7rem] text-[var(--ledger-muted)]">{year}</div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {monthEntries.length > 0 && (
        <StatCard label="월별 기록">
          <div className="flex flex-wrap gap-[0.4rem]">
            {monthEntries.map(([month, count]) => (
              <div
                key={month}
                className="rounded-[0.3rem] border border-[var(--atr-line)] bg-[rgba(88, 125, 163,0.05)] px-[0.65rem] py-[0.45rem] text-center"
              >
                <div className="afterroll-title text-[1.1rem] leading-none text-[var(--ledger-ink)]">{count}</div>
                <div className="afterroll-meta mt-[0.18rem] text-[0.65rem] text-[var(--ledger-muted)]">
                  {month.replace('-', '.')}
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}
    </div>
  );
}
