'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { getRelativeTime } from '@/lib/timeUtils';
import type { LogEntry } from '@/lib/data/log';

type Props = {
  grouped: Record<number, LogEntry[]>;
};

// 해시태그 색상 매핑
const tagColors: Record<string, string> = {
  개발: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  생각: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  일상: 'bg-green-500/20 text-green-300 border-green-400/30',
  디자인: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  음악: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  여행: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
};

// 이미지 그리드 컴포넌트
function ImageGrid({ images }: { images: string[] }) {
  const count = images.length;

  if (count === 0) return null;

  // 1장: 큰 이미지
  if (count === 1) {
    return (
      <div className="relative w-full h-[16rem] rounded-[0.75rem] overflow-hidden">
        <Image src={images[0]} alt="image" fill className="object-cover" />
      </div>
    );
  }

  // 2장: 1x2 그리드
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

  // 3장: 왼쪽 큰 이미지 + 오른쪽 작은 이미지 2개
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

  // 4장 이상: 2x2 그리드 (최대 4개만 표시)
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

function LogCard({ entry, isSameDay }: { entry: LogEntry; isSameDay: boolean }) {
  const relativeTime = getRelativeTime(entry.date);

  // 이미지 처리: images 우선, 없으면 image 사용
  const allImages = entry.images || (entry.image ? [entry.image] : []);

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
        {allImages.length > 0 && (
          <div className="mb-[1rem]">
            <ImageGrid images={allImages} />
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

export default function TimelineSection({ grouped }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [displayCount, setDisplayCount] = useState(10);
  const observerRef = useRef<HTMLDivElement>(null);

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  // 모든 태그 수집
  const allTags = new Set<string>();
  years.forEach(year => {
    grouped[year].forEach(entry => {
      entry.tags.forEach(tag => allTags.add(tag));
    });
  });

  // 필터링된 항목
  const filteredGrouped = selectedFilter === '전체'
    ? grouped
    : Object.fromEntries(
        Object.entries(grouped).map(([year, entries]) => [
          year,
          entries.filter(entry => entry.tags.includes(selectedFilter))
        ]).filter(([_, entries]) => entries.length > 0)
      );

  // 모든 항목을 평탄화 (flatten)하여 날짜순으로 정렬
  const allEntries: Array<{ year: number; entry: LogEntry; index: number; totalInYear: number }> = [];
  Object.entries(filteredGrouped).forEach(([yearStr, entries]) => {
    const year = Number(yearStr);
    const yearEntries = entries as LogEntry[];
    yearEntries.forEach((entry, index) => {
      allEntries.push({ year, entry, index, totalInYear: yearEntries.length });
    });
  });

  // 최신순으로 정렬 (날짜 기준 내림차순)
  allEntries.sort((a, b) => {
    const dateA = new Date(a.entry.date).getTime();
    const dateB = new Date(b.entry.date).getTime();
    return dateB - dateA; // 최신순
  });

  // 표시할 항목만 선택
  const displayedEntries = allEntries.slice(0, displayCount);
  const hasMore = displayCount < allEntries.length;

  // 무한 스크롤 - Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
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

  if (years.length === 0) {
    return (
      <div className="glass-card rounded-[1rem] p-[2rem] text-center text-[var(--color-muted)] font-serif text-[1rem]">
        아직 기록이 없습니다.
      </div>
    );
  }

  // 연도별로 그룹화하여 표시
  const groupedForDisplay: Record<number, Array<{ entry: LogEntry; index: number; totalInYear: number }>> = {};
  displayedEntries.forEach((item) => {
    if (!groupedForDisplay[item.year]) {
      groupedForDisplay[item.year] = [];
    }
    groupedForDisplay[item.year].push(item);
  });

  const displayYears = Object.keys(groupedForDisplay)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div>
      {/* 필터 칩 */}
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

      {/* 타임라인 */}
      <div className="space-y-[3rem]">
        {displayYears.map((year) => (
          <section key={year}>
            <h2 className="font-serif text-[1.5rem] font-light text-[var(--color-accent)] mb-[1.5rem] tracking-[0.04em]">
              {year}
            </h2>

            <div className="timeline-container">
              {groupedForDisplay[year].map((item, index) => {
                // 이전 항목과 날짜 비교 (같은 연도 내에서) - 날짜 부분만 비교
                const prevItem = index > 0 ? groupedForDisplay[year][index - 1] : null;
                const currentDate = item.entry.date.slice(0, 10); // YYYY-MM-DD만 추출
                const prevDate = prevItem ? prevItem.entry.date.slice(0, 10) : null;
                const isSameDay = prevDate ? currentDate === prevDate : false;

                return (
                  <LogCard
                    key={item.entry.slug}
                    entry={item.entry}
                    isSameDay={isSameDay}
                  />
                );
              })}
            </div>
          </section>
        ))}
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
