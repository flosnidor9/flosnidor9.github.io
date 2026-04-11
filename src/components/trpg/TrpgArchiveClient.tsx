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
    <main className="min-h-screen bg-[var(--film-bg)] px-[1.25rem] pb-[4rem] pt-[5rem] text-amber-50 md:px-[2rem]">
      <div className="mx-auto max-w-[72rem]">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="mb-[1.25rem] inline-flex items-center gap-[0.4rem] rounded-full border border-white/30 bg-white/5 px-[0.75rem] py-[0.45rem] text-[0.82rem] text-white/80 transition-colors hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        ) : null}

        <header className="mb-[2rem] md:mb-[2.5rem]">
          <p className="font-sans text-[0.78rem] uppercase tracking-[0.28em] text-amber-100/48">TRPG Archive</p>
          <h1 className="mt-[0.8rem] font-serif text-[2.5rem] leading-[0.95] text-white/95 md:text-[4.2rem]">{title}</h1>
          <p className="mt-[1rem] max-w-[38rem] font-sans text-[0.98rem] leading-[1.8] text-white/62 md:text-[1.02rem]">
            {description}
          </p>
        </header>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-[1rem] backdrop-blur-xl md:p-[1.25rem]">
          <div className="mb-[1.25rem] flex flex-wrap gap-[0.55rem]">
            {tags.map((tag) => {
              const isActive = tag === activeTag;

              return (
                <motion.button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-full border px-[0.85rem] py-[0.42rem] text-[0.82rem] transition-colors ${
                    isActive
                      ? 'border-amber-100/45 bg-amber-100 text-stone-950'
                      : 'border-white/12 bg-white/5 text-white/70 hover:bg-white/8'
                  }`}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>

          <div className="mb-[1rem] text-[0.82rem] text-white/45">
            {activeTag === ALL_TAG ? `All ${filteredPosts.length}` : `${activeTag} ${filteredPosts.length}`}
          </div>

          <ul className="space-y-[0.75rem]">
            {filteredPosts.map((post) => (
              <li key={post.fullSlug}>
                <Link
                  href={`/afterTheRoll/archive/read/${toGalleryPath(post.fullSlug)}`}
                  className="block rounded-[1rem] border border-white/10 bg-black/10 px-[1rem] py-[1rem] transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex flex-col gap-[0.6rem] md:flex-row md:items-start md:justify-between md:gap-[1rem]">
                    <div className="min-w-0">
                      <p className="font-serif text-[1.12rem] text-white/92 md:text-[1.2rem]">{post.title}</p>
                      {post.description ? (
                        <p className="mt-[0.35rem] text-[0.9rem] leading-[1.65] text-white/55">{post.description}</p>
                      ) : null}
                    </div>

                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-[0.75rem] py-[0.32rem] text-[0.74rem] text-white/52">
                      {post.scenarioTitle}
                    </span>
                  </div>

                  {post.tags.length > 0 ? (
                    <div className="mt-[0.8rem] flex flex-wrap gap-[0.45rem]">
                      {post.tags.map((tag) => (
                        <span
                          key={`${post.fullSlug}-${tag}`}
                          className="rounded-full border border-white/10 bg-white/5 px-[0.68rem] py-[0.24rem] text-[0.72rem] text-white/60"
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
