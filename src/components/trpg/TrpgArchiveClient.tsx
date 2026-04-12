'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { TrpgArchivePostMeta } from '@/lib/data/trpg';
import { toGalleryPath } from '@/lib/galleryPath';

type Props = {
  posts: TrpgArchivePostMeta[];
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

const ALL_TAG = 'All';

export default function TrpgArchiveClient({ posts, title, description, backHref, backLabel }: Props) {
  const [activeTag, setActiveTag] = useState(ALL_TAG);

  const uniqueTags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (tag.trim()) uniqueTags.add(tag);
    }
  }

  const tags = [ALL_TAG, ...Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, 'ko'))];
  const filteredPosts = activeTag === ALL_TAG ? posts : posts.filter((post) => post.tags.includes(activeTag));

  return (
    <main className="min-h-screen px-[1.1rem] pb-[4rem] pt-[5.2rem] text-[var(--ledger-ink)] md:px-[2rem]">
      <div className="mx-auto max-w-[72rem]">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="ledger-paper-panel ledger-dashed mb-[1.25rem] inline-flex items-center gap-[0.4rem] rounded-[0.5rem] px-[0.9rem] py-[0.5rem] text-[1rem] text-[var(--ledger-muted)] transition-transform hover:-translate-y-[0.03rem]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        ) : null}

        <header className="ledger-paper-panel relative mb-[2rem] overflow-hidden rounded-[0.9rem] px-[1.25rem] py-[1.3rem] md:mb-[2.5rem] md:px-[1.7rem] md:py-[1.6rem]">
          <div className="pointer-events-none absolute right-[-1rem] top-[-1rem] h-[7rem] w-[7rem] rounded-full bg-[radial-gradient(circle,rgba(193,142,88,0.16),transparent_70%)]" />
          <p className="text-[1.24rem] tracking-[0.03em] text-[var(--ledger-soft)]" style={{ fontFamily: 'var(--font-hand)' }}>TRPG Archive</p>
          <h1 className="mt-[0.6rem] text-[3.1rem] leading-[0.92] text-[var(--ledger-ink)] md:text-[5.2rem]" style={{ fontFamily: 'var(--font-hand)' }}>{title}</h1>
          <p className="mt-[0.85rem] max-w-[38rem] text-[1.15rem] leading-[1.65] text-[var(--ledger-muted)] md:text-[1.2rem]" style={{ fontFamily: 'var(--font-hand)' }}>
            {description}
          </p>
        </header>

        <section className="ledger-paper-panel rounded-[0.9rem] p-[1rem] md:p-[1.25rem]">
          <div className="mb-[1.25rem] flex flex-wrap gap-[0.55rem]">
            {tags.map((tag) => {
              const isActive = tag === activeTag;

              return (
                <motion.button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-[0.5rem] border px-[0.9rem] py-[0.48rem] text-[1rem] transition-colors ${
                    isActive
                      ? 'border-[rgba(127,79,42,0.35)] bg-[var(--ledger-accent)] text-[#fff7eb]'
                      : 'border-[rgba(87,67,48,0.14)] bg-[rgba(255,251,243,0.82)] text-[var(--ledger-muted)] hover:bg-[rgba(255,248,235,1)]'
                  }`}
                  style={{ fontFamily: 'var(--font-hand)' }}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>

          <div className="mb-[1rem] text-[0.98rem] text-[var(--ledger-soft)]" style={{ fontFamily: 'var(--font-hand)' }}>
            {activeTag === ALL_TAG ? `All ${filteredPosts.length}` : `${activeTag} ${filteredPosts.length}`}
          </div>

          <ul className="space-y-[0.75rem]">
            {filteredPosts.map((post) => (
              <li key={post.fullSlug}>
                <Link
                  href={`/afterTheRoll/archive/read/${toGalleryPath(post.fullSlug)}`}
                  className="ledger-note-card ledger-dashed block rounded-[0.7rem] px-[1rem] py-[1rem] transition-transform duration-200 hover:-translate-y-[0.03rem]"
                >
                  <div className="flex flex-col gap-[0.6rem] md:flex-row md:items-start md:justify-between md:gap-[1rem]">
                    <div className="min-w-0">
                      <p className="text-[1.34rem] leading-[1.1] text-[var(--ledger-ink)] md:text-[1.55rem]" style={{ fontFamily: 'var(--font-hand)' }}>{post.title}</p>
                      {post.description ? (
                        <p className="mt-[0.35rem] text-[1.02rem] leading-[1.6] text-[var(--ledger-muted)]" style={{ fontFamily: 'var(--font-hand)' }}>{post.description}</p>
                      ) : null}
                    </div>

                    <span className="shrink-0 rounded-[0.45rem] border border-[rgba(122,139,97,0.22)] bg-[rgba(122,139,97,0.1)] px-[0.78rem] py-[0.34rem] text-[1rem] text-[rgba(63,49,37,0.72)]" style={{ fontFamily: 'var(--font-hand)' }}>
                      {post.scenarioTitle}
                    </span>
                  </div>

                  {post.tags.length > 0 ? (
                    <div className="mt-[0.8rem] flex flex-wrap gap-[0.45rem]">
                      {post.tags.map((tag) => (
                        <span
                          key={`${post.fullSlug}-${tag}`}
                          className="rounded-[0.45rem] border border-[rgba(87,67,48,0.12)] bg-[rgba(255,250,239,0.85)] px-[0.7rem] py-[0.24rem] text-[0.92rem] text-[var(--ledger-muted)]"
                          style={{ fontFamily: 'var(--font-hand)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
