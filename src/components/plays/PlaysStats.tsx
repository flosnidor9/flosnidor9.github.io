'use client';

import { useState } from 'react';
import type { PlayEntry } from '@/lib/data/firebasePlays';

type TitleDates = { startDate: string; endDate: string | null };

const STATUS_LABEL = { completed: '완주', ongoing: '현행', dropped: '하차' } as const;

interface Props {
  plays: PlayEntry[];
  titleDatesMap: Map<string, TitleDates>;
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ledger-paper-panel rounded-[0.8rem] px-[1.2rem] py-[1rem]">
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
    const na = parseInt(a[0]) || 0;
    const nb = parseInt(b[0]) || 0;
    return na - nb;
  });

  const statusCounts = { completed: 0, ongoing: 0, dropped: 0 };
  plays.forEach((p) => { statusCounts[p.status] += 1; });

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
      <div className="ledger-paper-panel rounded-[0.8rem] p-[2rem] text-center afterroll-meta text-[var(--ledger-muted)]">
        등록된 플레이가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[0.8rem]">
      {/* 상태별 */}
      <StatCard label="상태별">
        <div className="flex gap-[1.8rem]">
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

      {/* 룰별 */}
      {ruleEntries.length > 0 && (
        <StatCard label="룰별">
          <div className="flex flex-col gap-[0.4rem]">
            {ruleEntries.map(([rule, count]) => (
              <div key={rule} className="flex items-center gap-[0.6rem]">
                <span className="afterroll-meta w-[6rem] shrink-0 text-[0.85rem] text-[var(--ledger-ink)]">
                  {rule}
                </span>
                <div className="flex-1 h-[0.28rem] rounded-full bg-[rgba(87,67,48,0.1)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--ledger-accent)]"
                    style={{ width: `${(count / plays.length) * 100}%`, opacity: 0.55 }}
                  />
                </div>
                <span className="afterroll-meta w-[2.5rem] text-right text-[0.8rem] text-[var(--ledger-muted)]">
                  {count}회
                </span>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* 인원별 */}
      {pcEntries.length > 0 && (
        <StatCard label="인원별">
          <div className="flex flex-wrap gap-[0.5rem]">
            {pcEntries.map(([pc, count]) => (
              <div
                key={pc}
                className="text-center px-[0.9rem] py-[0.55rem] rounded-[0.5rem] bg-[rgba(87,67,48,0.05)] border border-[rgba(87,67,48,0.1)]"
              >
                <div className="afterroll-title text-[1.4rem] leading-none text-[var(--ledger-ink)]">
                  {count}
                </div>
                <div className="afterroll-meta mt-[0.2rem] text-[0.7rem] text-[var(--ledger-muted)]">
                  {pc}인
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* 참여자 검색 */}
      <StatCard label="참여자 검색">
        <input
          value={participantSearch}
          onChange={(e) => setParticipantSearch(e.target.value)}
          placeholder="이름으로 검색..."
          className="w-full afterroll-meta text-[0.85rem] px-[0.7rem] py-[0.42rem] rounded-[0.4rem] border border-[rgba(87,67,48,0.2)] bg-[rgba(255,253,245,0.6)] text-[var(--ledger-ink)] outline-none focus:border-[var(--ledger-accent)] placeholder:text-[var(--ledger-muted)] transition-colors"
        />
        {searchTerm && (
          <div className="mt-[0.7rem]">
            <p className="afterroll-meta text-[0.82rem] text-[var(--ledger-muted)] mb-[0.4rem]">
              <span className="text-[var(--ledger-ink)]">"{searchTerm}"</span>과(와) 함께한 세션:{' '}
              <span className="text-[var(--ledger-accent)]">{matchedPlays.length}회</span>
            </p>
            <div className="flex flex-col gap-[0.2rem]">
              {matchedPlays.map((p) => (
                <div key={p.id} className="afterroll-meta text-[0.78rem] text-[var(--ledger-muted)]">
                  · {p.title}
                  <span className="ml-[0.4rem] text-[rgba(87,67,48,0.45)]">
                    ({STATUS_LABEL[p.status]})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </StatCard>

      {/* 연도별 */}
      {yearEntries.length > 0 && (
        <StatCard label="연도별">
          <div className="flex flex-wrap gap-[0.5rem]">
            {yearEntries.map(([year, count]) => (
              <div
                key={year}
                className="text-center px-[0.9rem] py-[0.55rem] rounded-[0.5rem] bg-[rgba(87,67,48,0.05)] border border-[rgba(87,67,48,0.1)]"
              >
                <div className="afterroll-title text-[1.4rem] leading-none text-[var(--ledger-ink)]">
                  {count}
                </div>
                <div className="afterroll-meta mt-[0.2rem] text-[0.7rem] text-[var(--ledger-muted)]">
                  {year}
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* 월별 */}
      {monthEntries.length > 0 && (
        <StatCard label="월별">
          <div className="flex flex-wrap gap-[0.4rem]">
            {monthEntries.map(([month, count]) => (
              <div
                key={month}
                className="text-center px-[0.65rem] py-[0.45rem] rounded-[0.4rem] bg-[rgba(87,67,48,0.05)] border border-[rgba(87,67,48,0.1)]"
              >
                <div className="afterroll-title text-[1.1rem] leading-none text-[var(--ledger-ink)]">
                  {count}
                </div>
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
