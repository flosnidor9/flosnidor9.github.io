'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

const TAPE_CLASSES = [
  'afterroll-tape-blue left-[3.2rem] -rotate-[0.5deg]',
  'afterroll-tape-yellow right-[3.4rem] rotate-[8deg]',
  'afterroll-tape-lime left-[4.2rem] rotate-[-12deg]',
  'afterroll-tape-pink right-[2.8rem] -rotate-[3deg]',
] as const;

const CARD_CLASSES = [
  'paper-lined paper-holes-left afterroll-shadow-soft',
  'paper-grid paper-torn-bottom afterroll-shadow-soft',
  'paper-memo afterroll-shadow-soft',
  'paper-margin-red paper-holes-left afterroll-shadow-soft',
] as const;

export default function TrpgArchiveClient({ posts, title, description, backHref, backLabel }: Props) {
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const uniqueTags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (tag.trim()) uniqueTags.add(tag);
    }
  }

  const tags = Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, 'ko'));
  const filteredPosts =
    activeTags.length === 0
      ? posts
      : posts.filter((post) => activeTags.some((tag) => post.tags.includes(tag)));
  const groupedPosts = useMemo(() => {
    const groups = new Map<string, TrpgArchivePostMeta[]>();

    for (const post of filteredPosts) {
      const key = post.year || 'Unsorted';
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(post);
      } else {
        groups.set(key, [post]);
      }
    }

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0], 'en'));
  }, [filteredPosts]);

  function toggleTag(tag: string) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );
  }

  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5.2rem] text-[var(--ledger-ink)] md:px-[2rem]">
      <div className="mx-auto max-w-[72rem]">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="ledger-paper-panel ledger-dashed afterroll-note mb-[1.25rem] inline-flex items-center gap-[0.4rem] rounded-[0.5rem] px-[0.9rem] py-[0.5rem] text-[1rem] text-[var(--ledger-muted)] transition-transform hover:-translate-y-[0.03rem]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        ) : null}

        <header className="ledger-paper-sheet paper-lined paper-holes-left paper-torn-top relative mb-[2rem] overflow-hidden rounded-[1.5rem] px-[1.4rem] py-[1.5rem] md:mb-[2.5rem] md:px-[2rem] md:py-[1.9rem]">
          <span className={`afterroll-tape ${TAPE_CLASSES[0]}`} />
          <p className="afterroll-meta relative z-[1] text-[1.02rem] uppercase tracking-[0.18em] text-[var(--ledger-soft)]">Archive Record</p>
          <h1 className="afterroll-title mt-[0.6rem] text-[3.1rem] leading-[0.92] text-[var(--ledger-ink)] md:text-[5.2rem]">{title}</h1>
          <div className="ledger-paper-rule relative z-[1] mt-[0.8rem] w-full max-w-[10rem]" />
          <p className="afterroll-body mt-[0.85rem] max-w-[38rem] text-[1.06rem] leading-[1.75] text-[var(--ledger-muted)] md:text-[1.12rem]">
            {description}
          </p>
        </header>

        <section className="ledger-paper-sheet paper-grid relative rounded-[1rem] p-[1rem] md:p-[1.25rem]">
          <span className={`afterroll-tape ${TAPE_CLASSES[1]}`} />
          <div className="mb-[1.25rem] flex flex-wrap gap-[0.55rem]">
            <motion.button
              type="button"
              onClick={() => setActiveTags([])}
              whileTap={{ scale: 0.98 }}
              className={`afterroll-meta rounded-[0.2rem] px-[0.9rem] py-[0.48rem] text-[0.95rem] transition-colors ${
                activeTags.length === 0 ? 'ledger-index-tab-active' : 'ledger-index-tab hover:bg-[rgba(236,220,194,0.96)]'
              }`}
            >
              All
            </motion.button>
            {tags.map((tag) => {
              const isActive = activeTags.includes(tag);

              return (
                <motion.button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  whileTap={{ scale: 0.98 }}
                  className={`afterroll-meta rounded-[0.2rem] px-[0.9rem] py-[0.48rem] text-[0.95rem] transition-colors ${
                    isActive ? 'ledger-index-tab-active' : 'ledger-index-tab hover:bg-[rgba(236,220,194,0.96)]'
                  }`}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>

          <div className="afterroll-meta mb-[1rem] text-[0.88rem] uppercase tracking-[0.12em] text-[var(--ledger-soft)]">
            {activeTags.length === 0
              ? `All ${filteredPosts.length}`
              : `${activeTags.join(' + ')} ${filteredPosts.length}`}
          </div>

          <div className="space-y-[1rem]">
            {groupedPosts.map(([year, yearPosts]) => (
              <section key={year} className="space-y-[0.75rem]">
                <div className="flex items-end justify-between gap-[1rem] border-b border-[rgba(87,67,48,0.12)] pb-[0.35rem]">
                  <p className="afterroll-title text-[2rem] leading-none text-[var(--ledger-ink)]">{year}</p>
                  <p className="afterroll-meta text-[0.78rem] uppercase tracking-[0.12em] text-[var(--ledger-soft)]">{yearPosts.length} records</p>
                </div>

                <ul className="space-y-[0.75rem]">
                  {yearPosts.map((post, index) => (
                    <li key={post.fullSlug}>
                      <Link
                        href={`/afterTheRoll/archive/read/${toGalleryPath(post.fullSlug)}`}
                        className={`ledger-paper-sheet relative block px-[1rem] py-[1rem] transition-transform duration-200 hover:-translate-y-[0.03rem] ${CARD_CLASSES[index % CARD_CLASSES.length]} ${
                          index % 2 === 0 ? 'rotate-[-0.35deg]' : 'rotate-[0.28deg]'
                        } ${index % 3 === 0 ? 'rounded-[1.45rem]' : 'rounded-[0.6rem]'}`}
                      >
                        <span className={`afterroll-tape ${TAPE_CLASSES[(index + 2) % TAPE_CLASSES.length]}`} />
                        <div className="relative z-[1] flex flex-col gap-[0.8rem] md:flex-row md:items-start md:justify-between md:gap-[1rem]">
                          <div className="min-w-0">
                            <p className="afterroll-title text-[1.34rem] leading-[1.1] text-[var(--ledger-ink)] md:text-[1.55rem]">{post.title}</p>
                            <div className="ledger-paper-rule mt-[0.4rem] w-full max-w-[7rem]" />
                            {post.description ? (
                              <p className="afterroll-body mt-[0.45rem] text-[0.98rem] leading-[1.68] text-[var(--ledger-muted)]">{post.description}</p>
                            ) : null}
                          </div>

                          <span className="ledger-stamp afterroll-meta shrink-0 self-start rounded-[0.2rem] px-[0.78rem] py-[0.34rem] text-[0.88rem] uppercase tracking-[0.08em]">
                            {post.scenarioTitle}
                          </span>
                        </div>

                        {post.tags.length > 0 ? (
                          <div className="relative z-[1] mt-[0.9rem] flex flex-wrap gap-[0.45rem]">
                            {post.tags.map((tag) => (
                              <span
                                key={`${post.fullSlug}-${tag}`}
                                className="afterroll-meta bg-[rgba(255,250,239,0.78)] px-[0.55rem] py-[0.18rem] text-[0.8rem] uppercase tracking-[0.08em] text-[var(--ledger-muted)]"
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
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
