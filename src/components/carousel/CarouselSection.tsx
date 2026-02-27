'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import GlassCard from './GlassCard';
import type { FolderData } from '@/lib/data/folders';

type Props = {
  folders: FolderData[];
};

export default function CarouselSection({ folders }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liquidFast, setLiquidFast] = useState(false);

  // 휠 → 가로 스크롤 변환
  // React onWheel은 passive라 preventDefault 불가 → 직접 addEventListener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth;
      const canLeft = el.scrollLeft > 0;
      if ((e.deltaY > 0 && canRight) || (e.deltaY < 0 && canLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.4;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleHoverChange = useCallback((hovered: boolean) => {
    setLiquidFast(hovered);
  }, []);

  if (!folders.length) return null;

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* 리퀴드 그라데이션 배경 */}
      <div
        className={`absolute inset-0 liquid-bg pointer-events-none ${liquidFast ? 'liquid-fast' : ''}`}
      />

      {/* 섹션 타이틀 */}
      <div className="relative px-[10vw] mb-[2.5rem]">
        <p className="font-sans text-[0.75rem] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-[0.5rem]">
          Archive
        </p>
        <h2 className="font-serif text-[3rem] text-[var(--color-text)]">
          Folders
        </h2>
      </div>

      {/* 가로 스크롤 컨테이너 */}
      <div
        ref={scrollRef}
        className="relative flex gap-[2rem] px-[10vw] pb-[3rem] overflow-x-auto hide-scrollbar"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {folders.map((folder) => (
          <div key={folder.slug} style={{ scrollSnapAlign: 'start' }}>
            <GlassCard folder={folder} onHoverChange={handleHoverChange} />
          </div>
        ))}
        {/* 끝 여백 */}
        <div className="flex-shrink-0 w-[10vw]" />
      </div>
    </section>
  );
}
