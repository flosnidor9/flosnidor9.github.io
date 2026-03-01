'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToLogs, type FirebaseLogEntry } from '@/lib/data/firebaseLog';
import LogComposer from './LogComposer';
import AdminLoginButton from './AdminLoginButton';

// 해시태그 색상 매핑
const tagColors: Record<string, string> = {
  일상: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  마젠타: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
  그린: 'bg-green-500/20 text-green-300 border-green-400/30',
  스카이: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  마젠그린: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  마코스카: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
};

// 상대 시간 포맷
function getRelativeTime(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 이미지 그리드 컴포넌트
function ImageGrid({ images }: { images: string[] }) {
  const count = images.length;

  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className="relative w-full h-[16rem] rounded-[0.75rem] overflow-hidden">
        <Image src={images[0]} alt="image" fill className="object-cover" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-[0.25rem] rounded-[0.75rem] overflow-hidden">
        {images.slice(0, 2).map((img, i) => (
          <div key={i} className="relative h-[12rem]">
            <Image src={img} alt={`image-${i}`} fill className="object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-[0.25rem] rounded-[0.75rem] overflow-hidden">
        <div className="relative row-span-2 h-[16rem]">
          <Image src={images[0]} alt="image-0" fill className="object-cover" />
        </div>
        <div className="grid grid-rows-2 gap-[0.25rem]">
          {images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative h-[7.875rem]">
              <Image src={img} alt={`image-${i + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-[0.25rem] rounded-[0.75rem] overflow-hidden">
      {images.slice(0, 4).map((img, i) => (
        <div key={i} className="relative h-[10rem]">
          <Image src={img} alt={`image-${i}`} fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}

function LogCard({ entry, isSameDay }: { entry: FirebaseLogEntry; isSameDay: boolean }) {
  const relativeTime = getRelativeTime(entry.timestamp);

  return (
    <div className={`timeline-item ${isSameDay ? 'timeline-item-same-day' : 'timeline-item-different-day'}`}>
      <div className="log-card relative rounded-[1rem]">
        {/* 헤더: 시간 */}
        <div className="flex items-center gap-[0.5rem] mb-[0.75rem]">
          <time className="text-[0.85rem] text-[var(--color-muted)]">
            {relativeTime}
          </time>
        </div>

        {/* 해시태그 */}
        {entry.tags.length > 0 && (
          <div className="flex gap-[0.4rem] flex-wrap mb-[0.75rem]">
            {entry.tags.map((tag) => {
              const colorClass = tagColors[tag] || 'bg-gray-500/20 text-gray-300 border-gray-400/30';
              return (
                <span
                  key={tag}
                  className={`inline-block text-[0.8rem] font-medium px-[0.6rem] py-[0.25rem] rounded-full border ${colorClass}`}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {/* 이미지 그리드 */}
        {entry.images && entry.images.length > 0 && (
          <div className="mb-[1rem]">
            <ImageGrid images={entry.images} />
          </div>
        )}

        {/* 본문 */}
        <div className="prose prose-sm prose-invert max-w-none text-[var(--color-text)] text-[0.95rem] leading-relaxed">
          <ReactMarkdown>{entry.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default function FirebaseLogSection() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FirebaseLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [displayCount, setDisplayCount] = useState(10);
  const observerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Firestore 실시간 구독
  useEffect(() => {
    const unsubscribe = subscribeToLogs((newEntries) => {
      setEntries(newEntries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 모든 태그 수집
  const allTags = new Set<string>();
  entries.forEach((entry) => {
    entry.tags.forEach((tag) => allTags.add(tag));
  });

  // 필터링된 항목
  const filteredEntries =
    selectedFilter === '전체'
      ? entries
      : entries.filter((entry) => entry.tags.includes(selectedFilter));

  // 연도별 그룹화
  const groupedByYear: Record<number, FirebaseLogEntry[]> = {};
  filteredEntries.forEach((entry) => {
    if (!groupedByYear[entry.year]) {
      groupedByYear[entry.year] = [];
    }
    groupedByYear[entry.year].push(entry);
  });

  const years = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a);

  // 표시할 항목
  const displayedEntries = filteredEntries.slice(0, displayCount);
  const hasMore = displayCount < filteredEntries.length;

  // 표시할 항목을 연도별로 그룹화
  const groupedForDisplay: Record<number, FirebaseLogEntry[]> = {};
  displayedEntries.forEach((entry) => {
    if (!groupedForDisplay[entry.year]) {
      groupedForDisplay[entry.year] = [];
    }
    groupedForDisplay[entry.year].push(entry);
  });

  const displayYears = Object.keys(groupedForDisplay)
    .map(Number)
    .sort((a, b) => b - a);

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting && hasMore) {
          setDisplayCount((prev) => prev + 10);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore]);

  // 필터 변경 시 displayCount 초기화
  useEffect(() => {
    setDisplayCount(10);
  }, [selectedFilter]);

  if (loading || authLoading) {
    return (
      <div className="glass-card rounded-[1rem] p-[2rem] text-center text-[var(--color-muted)] font-serif text-[1rem]">
        불러오는 중...
      </div>
    );
  }

  return (
    <div>
      {/* 관리자 로그인 버튼 */}
      <div className="mb-[1.5rem] flex justify-end">
        <AdminLoginButton />
      </div>

      {/* 관리자: 작성 폼 */}
      {isAdmin && <LogComposer timelineRef={timelineRef} />}

      {/* 필터 칩 */}
      {allTags.size > 0 && (
        <div className="filter-chips mb-[2rem] flex gap-[0.5rem] flex-wrap">
          <button
            onClick={() => setSelectedFilter('전체')}
            className={`filter-chip px-[1rem] py-[0.5rem] rounded-full text-[0.85rem] font-medium border transition-all ${
              selectedFilter === '전체'
                ? 'bg-blue-600/30 text-blue-200 border-blue-500/50'
                : 'bg-[var(--color-surface)]/50 text-[var(--color-muted)] border-transparent hover:bg-[var(--color-surface)]'
            }`}
          >
            전체
          </button>
          {Array.from(allTags).map((tag) => {
            const colorClass = tagColors[tag] || 'bg-gray-500/20 text-gray-300 border-gray-400/30';
            return (
              <button
                key={tag}
                onClick={() => setSelectedFilter(tag)}
                className={`filter-chip px-[1rem] py-[0.5rem] rounded-full text-[0.85rem] font-medium border transition-all ${
                  selectedFilter === tag
                    ? colorClass
                    : 'bg-[var(--color-surface)]/50 text-[var(--color-muted)] border-transparent hover:bg-[var(--color-surface)]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* 타임라인 */}
      <div ref={timelineRef} className="space-y-[3rem]">
        {displayYears.length === 0 ? (
          <div className="glass-card rounded-[1rem] p-[2rem] text-center text-[var(--color-muted)] font-serif text-[1rem]">
            아직 기록이 없습니다.
          </div>
        ) : (
          displayYears.map((year) => (
            <section key={year}>
              <h2 className="font-serif text-[1.5rem] font-light text-[var(--color-accent)] mb-[1.5rem] tracking-[0.04em]">
                {year}
              </h2>

              <div className="timeline-container">
                {groupedForDisplay[year].map((entry, index) => {
                  // 이전 항목과 날짜 비교
                  const prevEntry = index > 0 ? groupedForDisplay[year][index - 1] : null;
                  const currentDate = entry.timestamp.toDate().toDateString();
                  const prevDate = prevEntry ? prevEntry.timestamp.toDate().toDateString() : null;
                  const isSameDay = prevDate ? currentDate === prevDate : false;

                  return (
                    <LogCard
                      key={entry.id}
                      entry={entry}
                      isSameDay={isSameDay}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* 무한 스크롤 트리거 */}
      {hasMore && (
        <div ref={observerRef} className="h-[1px] w-full mt-[2rem]" />
      )}

      {/* 로딩 표시 */}
      {hasMore && (
        <div className="text-center py-[2rem] text-[var(--color-muted)] text-[0.85rem]">
          더 불러오는 중...
        </div>
      )}
    </div>
  );
}
