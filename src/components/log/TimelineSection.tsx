'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import type { LogEntry } from '@/lib/data/log';

type Props = {
  grouped: Record<number, LogEntry[]>;
};

function LogCard({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);

  const preview = entry.content
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(' ');

  const dateObj = new Date(entry.date + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="log-card glass-card relative rounded-[1rem] p-[1.25rem] cursor-pointer"
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex gap-[1.25rem] items-start">
        {/* 날짜 */}
        <time className="font-serif text-[0.8rem] text-[var(--color-muted)] shrink-0 pt-[0.15rem] min-w-[4rem]">
          {formatted}
        </time>

        {/* 본문 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-[1.05rem] text-[var(--color-text)] mb-[0.3rem] leading-snug">
            {entry.title}
          </h3>

          {!open && (
            <p className="text-[0.82rem] text-[var(--color-muted)] leading-relaxed line-clamp-2">
              {preview}
            </p>
          )}

          {entry.tags.length > 0 && (
            <div className="flex gap-[0.3rem] flex-wrap mt-[0.5rem]">
              {entry.tags.map((tag) => (
                <span key={tag} className="glass-tag text-[0.68rem]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 썸네일 */}
        {entry.image && !open && (
          <div className="relative w-[4rem] h-[4rem] shrink-0 rounded-[0.5rem] overflow-hidden">
            <Image src={entry.image} alt={entry.title} fill className="object-cover" />
          </div>
        )}
      </div>

      {/* 확장 내용 */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-[1rem] pt-[1rem] border-t border-[var(--color-border)]">
              {entry.image && (
                <div className="relative w-full h-[12rem] mb-[1rem] rounded-[0.75rem] overflow-hidden">
                  <Image src={entry.image} alt={entry.title} fill className="object-cover" />
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none text-[var(--color-text)] text-[0.88rem] leading-relaxed">
                <ReactMarkdown>{entry.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TimelineSection({ grouped }: Props) {
  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  if (years.length === 0) {
    return (
      <div className="glass-card rounded-[1rem] p-[2rem] text-center text-[var(--color-muted)] font-serif text-[1rem]">
        아직 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-[3rem]">
      {years.map((year) => (
        <section key={year}>
          <h2 className="font-serif text-[2rem] font-light text-[var(--color-accent)] mb-[1.5rem] tracking-[0.04em]">
            {year}
          </h2>

          {/* 타임라인 컨테이너 */}
          <div className="timeline-container relative pl-[1rem]">
            <div className="space-y-[1rem]">
              {grouped[year].map((entry) => (
                <LogCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
