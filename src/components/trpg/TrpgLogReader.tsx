'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  htmlUrl: string;
  fallbackAvatarSrc?: string;
};

type LogEntry = {
  id: string;
  speaker: string;
  avatarSrc: string | null;
  contentHtml: string;
  isAside: boolean;
  kind: 'chat' | 'media';
};

const MAX_PAGE_ENTRIES = 80;
const MAX_PAGE_WEIGHT = 120000;
const STANDALONE_UNNAMED_AVATAR_NAME = 'files-d20-io-images-455987480-ALgG0ivc0aW7C7whBPcVnQ-max.png';

function normalizeSpeaker(raw: string | null | undefined): string {
  return (raw ?? '').replace(/:\s*$/, '').trim();
}

function isAsideMessage(node: Element): boolean {
  return Boolean(
    node.querySelector(
      'span[style*="color: rgb(170, 170, 170)"], span[style*="color:rgb(170,170,170)"]',
    ),
  );
}

function isStandaloneUnnamedAvatar(avatarSrc: string | null): boolean {
  return avatarSrc?.includes(STANDALONE_UNNAMED_AVATAR_NAME) ?? false;
}

function parseEntries(html: string): LogEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const nodes = Array.from(doc.querySelectorAll('.message.general, .message.desc'));
  const parsed = nodes
    .map((node, index) => {
      const isMedia = node.classList.contains('desc');
      const speaker = normalizeSpeaker(node.querySelector('.by')?.textContent);
      const avatarSrc = node.querySelector('.avatar img')?.getAttribute('src') ?? null;
      const clone = node.cloneNode(true) as HTMLElement;
      const isAside = isAsideMessage(node);

      clone.querySelectorAll('.avatar, .by, .spacer, br.Apple-interchange-newline').forEach((element) => {
        element.remove();
      });

      const contentHtml = clone.innerHTML.trim();
      if (!contentHtml) return null;

      return {
        id: `${speaker}-${index}`,
        speaker,
        avatarSrc,
        contentHtml,
        isAside,
        kind: isMedia ? 'media' : 'chat',
      };
    })
    .filter((entry): entry is LogEntry => Boolean(entry));

  const merged: LogEntry[] = [];

  for (const entry of parsed) {
    const lastEntry = merged[merged.length - 1];
    const keepsEmptySpeaker = !entry.speaker && isStandaloneUnnamedAvatar(entry.avatarSrc);
    const resolvedSpeaker = keepsEmptySpeaker ? '' : entry.speaker || lastEntry?.speaker || '';
    const resolvedAvatar = entry.avatarSrc || lastEntry?.avatarSrc || null;
    const canMerge =
      Boolean(lastEntry) &&
      lastEntry.kind === 'chat' &&
      entry.kind === 'chat' &&
      (
        (!entry.speaker && !keepsEmptySpeaker) ||
        lastEntry.speaker === resolvedSpeaker
      ) &&
      lastEntry.isAside === entry.isAside;

    if (canMerge) {
      lastEntry.contentHtml = `${lastEntry.contentHtml}<div class="trpg-log-continuation">${entry.contentHtml}</div>`;
      if (!lastEntry.avatarSrc && resolvedAvatar) {
        lastEntry.avatarSrc = resolvedAvatar;
      }
      continue;
    }

    merged.push({
      ...entry,
      speaker: resolvedSpeaker,
      avatarSrc: resolvedAvatar,
    });
  }

  return merged;
}

function paginateEntries(entries: LogEntry[]): LogEntry[][] {
  const pages: LogEntry[][] = [];
  let current: LogEntry[] = [];
  let weight = 0;

  for (const entry of entries) {
    const entryWeight = entry.contentHtml.length + entry.speaker.length * 8;
    const shouldSplit =
      current.length > 0 &&
      (current.length >= MAX_PAGE_ENTRIES || weight + entryWeight > MAX_PAGE_WEIGHT);

    if (shouldSplit) {
      pages.push(current);
      current = [];
      weight = 0;
    }

    current.push(entry);
    weight += entryWeight;
  }

  if (current.length > 0) pages.push(current);
  return pages;
}

export default function TrpgLogReader({ htmlUrl, fallbackAvatarSrc }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [showAside, setShowAside] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(htmlUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then((text) => setHtml(text))
      .catch(() => setHtml(''));

    return () => controller.abort();
  }, [htmlUrl]);

  const entries = useMemo(() => (html ? parseEntries(html) : []), [html]);
  const visibleEntries = useMemo(
    () => (showAside ? entries : entries.filter((entry) => !entry.isAside)),
    [entries, showAside],
  );
  const pages = useMemo(() => paginateEntries(visibleEntries), [visibleEntries]);
  const currentPage = pages[pageIndex] ?? [];

  useEffect(() => {
    setPageIndex(0);
  }, [htmlUrl, html]);

  useEffect(() => {
    setPageIndex((value) => Math.min(value, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageIndex]);

  if (html === null) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center text-[0.95rem] text-white/55">
        Loading archive...
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center text-[0.95rem] text-white/55">
        No readable messages found.
      </div>
    );
  }

  return (
    <section className="trpg-log-reader px-[0.75rem] py-[0.9rem] md:px-[1.25rem] md:py-[1.25rem]">
      <PageNav
        pageIndex={pageIndex}
        pageCount={pages.length}
        onFirst={() => setPageIndex(0)}
        onLast={() => setPageIndex(Math.max(0, pages.length - 1))}
        onPrev={() => setPageIndex((value) => Math.max(0, value - 1))}
        onNext={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
        onSelect={(value) => setPageIndex(value)}
      />

      <div className="mt-[0.65rem] flex items-center justify-between gap-[1rem] rounded-[1rem] border border-white/10 bg-white/[0.04] px-[0.9rem] py-[0.7rem] text-[0.78rem] text-white/68">
        <p>{visibleEntries.length} entries</p>
        <label className="inline-flex items-center gap-[0.5rem]">
          <input
            type="checkbox"
            checked={showAside}
            onChange={(event) => setShowAside(event.target.checked)}
            className="h-[0.95rem] w-[0.95rem]"
          />
          <span>사담 포함</span>
        </label>
      </div>

      <div className="mt-[0.7rem] space-y-[0.4rem]">
        {currentPage.map((entry) => (
          <article
            key={entry.id}
            className={
              entry.kind === 'media'
                ? 'rounded-[1rem] border border-black/6 bg-[#f2eee7] p-[0.45rem] shadow-[0_0.45rem_0.9rem_rgba(15,12,10,0.03)] md:p-[0.55rem]'
                : `grid grid-cols-[2.35rem_minmax(0,1fr)] gap-[0.38rem] rounded-[0.8rem] border p-[0.24rem] shadow-[0_0.45rem_0.9rem_rgba(15,12,10,0.03)] md:grid-cols-[2.6rem_minmax(0,1fr)] md:p-[0.28rem] ${
                    entry.isAside ? 'border-black/6 bg-[#ece9e3]' : 'border-black/8 bg-[#f2eee7]'
                  }`
            }
          >
            {entry.kind === 'media' ? (
              <div className="rounded-[0.9rem] border border-black/6 bg-white/82 px-[0.45rem] py-[0.45rem] shadow-[0_0.35rem_0.8rem_rgba(15,12,10,0.03)] md:px-[0.55rem] md:py-[0.55rem]">
                <div
                  className="trpg-media-bubble overflow-hidden rounded-[0.7rem] bg-[#fbfaf7]"
                  dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center">
                  {entry.avatarSrc || fallbackAvatarSrc ? (
                    <img
                      src={entry.avatarSrc || fallbackAvatarSrc || ''}
                      alt={entry.speaker || 'Narration'}
                      className="h-[2.35rem] w-[2.35rem] object-cover md:h-[2.55rem] md:w-[2.55rem]"
                    />
                  ) : (
                    <div className="flex h-[2.35rem] w-[2.35rem] items-center justify-center text-[0.46rem] text-black/35 md:h-[2.55rem] md:w-[2.55rem]">
                      Log
                    </div>
                  )}
                </div>

                <div className="flex min-h-full min-w-0 flex-col justify-center">
                  {entry.speaker ? (
                    <p className="mb-[0.34rem] px-[0.15rem] font-sans text-[0.56rem] leading-[1.1] text-black/48 md:text-[0.6rem]">
                      {entry.speaker}
                    </p>
                  ) : (
                    <div className="mb-[0.34rem]" />
                  )}
                    <div
                     className={`min-w-0 overflow-x-auto overflow-y-hidden rounded-[0.8rem] border px-[0.58rem] py-[0.45rem] text-[0.85rem] leading-[1.42] shadow-[0_0.35rem_0.8rem_rgba(15,12,10,0.03)] md:px-[0.66rem] md:py-[0.5rem] ${
                     entry.isAside ? 'border-black/5 bg-[#f8f6f2] text-black/48' : 'border-black/6 bg-white/82 text-black/78'
                     }`}
                   >
                    <div className="min-w-0" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>

      <PageNav
        pageIndex={pageIndex}
        pageCount={pages.length}
        onFirst={() => setPageIndex(0)}
        onLast={() => setPageIndex(Math.max(0, pages.length - 1))}
        onPrev={() => setPageIndex((value) => Math.max(0, value - 1))}
        onNext={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
        onSelect={(value) => setPageIndex(value)}
      />

      <style jsx global>{`
        .trpg-log-reader .message {
          padding: 0 !important;
          background: transparent !important;
          color: inherit !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .trpg-log-reader p,
        .trpg-log-reader div,
        .trpg-log-reader span {
          max-width: 100%;
          word-break: keep-all;
          overflow-wrap: anywhere;
          margin: 0 !important;
        }

        .trpg-log-reader .trpg-log-continuation {
          margin-top: 0.1rem !important;
        }

        .trpg-log-reader .trpg-media-bubble a {
          display: block;
          width: 100%;
        }

        .trpg-log-reader img {
          display: block;
          max-width: min(100%, 42rem) !important;
          height: auto !important;
        }

        .trpg-log-reader .trpg-media-bubble img {
          width: 100%;
          max-width: none !important;
          border-radius: 0.7rem;
          object-fit: contain;
        }

        .trpg-log-reader .sheet-rolltemplate-ninpo,
        .trpg-log-reader .sheet-container,
        .trpg-log-reader .sheet-common {
          max-width: 100% !important;
        }

        .trpg-log-reader .sheet-rolltemplate-ninpo {
          margin-top: 0.12rem !important;
        }

        .trpg-log-reader table {
          display: table !important;
          width: 100% !important;
          max-width: 100% !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
        }

        .trpg-log-reader tbody,
        .trpg-log-reader thead,
        .trpg-log-reader tr {
          max-width: 100% !important;
        }

        .trpg-log-reader td,
        .trpg-log-reader th {
          width: auto !important;
          white-space: normal !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          vertical-align: top !important;
        }

        .trpg-log-reader .sheet-rolltemplate-ninpo table,
        .trpg-log-reader .sheet-container table,
        .trpg-log-reader .sheet-common table {
          width: 100% !important;
        }

        .trpg-log-reader .sheet-rolltable-wrapper {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.5rem !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        .trpg-log-reader .sheet-rolltable-wrapper > * {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        .trpg-log-reader .sheet-rolltable-wrapper > .inlinerollresult {
          width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
        }

        .trpg-log-reader .sheet-rolltable-wrapper > .sheet-effect {
          display: block !important;
          width: 100% !important;
          white-space: pre-line !important;
          word-break: keep-all !important;
          overflow-wrap: anywhere !important;
        }

        .trpg-log-reader .sheet-rolltemplate-ninpo td,
        .trpg-log-reader .sheet-rolltemplate-ninpo th,
        .trpg-log-reader .sheet-container td,
        .trpg-log-reader .sheet-container th,
        .trpg-log-reader .sheet-common td,
        .trpg-log-reader .sheet-common th {
          padding: 0.22rem 0.28rem !important;
        }

        .trpg-log-reader .sheet-container {
          font-size: 12px !important;
        }
      `}</style>
    </section>
  );
}

type PageNavProps = {
  pageIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onSelect: (pageIndex: number) => void;
};

function PageNav({ pageIndex, pageCount, onPrev, onNext, onFirst, onLast, onSelect }: PageNavProps) {
  const start = Math.max(0, pageIndex - 2);
  const end = Math.min(pageCount, start + 5);
  const adjustedStart = Math.max(0, end - 5);
  const pages = Array.from({ length: end - adjustedStart }, (_, index) => adjustedStart + index);

  return (
    <div className="mt-[0.35rem] flex items-center justify-between gap-[1rem] rounded-[1rem] border border-white/10 bg-white/[0.04] px-[0.9rem] py-[0.75rem] text-[0.82rem] text-white/70">
      <div className="flex items-center gap-[0.4rem]">
        <button
          type="button"
          onClick={onFirst}
          disabled={pageIndex === 0}
          className="rounded-full border border-white/15 px-[0.7rem] py-[0.35rem] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          First
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={pageIndex === 0}
          className="rounded-full border border-white/15 px-[0.7rem] py-[0.35rem] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Prev
        </button>
      </div>

      <div className="flex items-center gap-[0.35rem]">
        {pages.map((value) => {
          const active = value === pageIndex;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={`min-w-[2rem] rounded-full border px-[0.6rem] py-[0.35rem] transition-colors ${
                active
                  ? 'border-amber-100/50 bg-amber-100/15 text-amber-50'
                  : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {value + 1}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-[0.4rem]">
        <button
          type="button"
          onClick={onNext}
          disabled={pageIndex >= pageCount - 1}
          className="rounded-full border border-white/15 px-[0.7rem] py-[0.35rem] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={pageIndex >= pageCount - 1}
          className="rounded-full border border-white/15 px-[0.7rem] py-[0.35rem] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Last
        </button>
      </div>
    </div>
  );
}
