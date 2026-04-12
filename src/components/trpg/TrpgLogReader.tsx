'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  isWhisper: boolean;
  kind: 'chat' | 'media';
};

const MAX_PAGE_ENTRIES = 80;
const MAX_PAGE_WEIGHT = 120000;
const STANDALONE_UNNAMED_AVATAR_NAME = 'files-d20-io-images-455987480-ALgG0ivc0aW7C7whBPcVnQ-max.png';
const RELOAD_STORAGE_KEY = 'trpg-log-reader-reload';

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
  const nodes = Array.from(doc.querySelectorAll('.message.general, .message.desc, .message.private'));
  const parsed = nodes
    .map((node, index) => {
      const isMedia = node.classList.contains('desc');
      const isWhisper = node.classList.contains('private') || node.classList.contains('whisper');
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
        isWhisper,
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
       ((!entry.speaker && !keepsEmptySpeaker) || lastEntry.speaker === resolvedSpeaker) &&
       lastEntry.isAside === entry.isAside &&
       lastEntry.isWhisper === entry.isWhisper;

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
  const readerRef = useRef<HTMLElement | null>(null);
  const restoredPageRef = useRef(false);
  const shouldScrollToReaderRef = useRef(false);

  useEffect(() => {
    restoredPageRef.current = false;
    shouldScrollToReaderRef.current = false;

    const savedReloadState = window.sessionStorage.getItem(RELOAD_STORAGE_KEY);
    if (!savedReloadState) {
      setPageIndex(0);
      return;
    }

    window.sessionStorage.removeItem(RELOAD_STORAGE_KEY);

    let parsedPageIndex = Number.NaN;

    try {
      const parsed = JSON.parse(savedReloadState) as { htmlUrl?: string; pageIndex?: number };
      if (parsed.htmlUrl === htmlUrl && typeof parsed.pageIndex === 'number') {
        parsedPageIndex = parsed.pageIndex;
      }
    } catch {
      parsedPageIndex = Number.NaN;
    }

    setPageIndex(Number.isNaN(parsedPageIndex) ? 0 : Math.max(0, parsedPageIndex));
  }, [htmlUrl]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(htmlUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then((text) => {
        setHtml(text);
      })
      .catch(() => {
        setHtml('');
      });

    return () => controller.abort();
  }, [htmlUrl]);

  const entries = useMemo(() => (html ? parseEntries(html) : []), [html]);
  const visibleEntries = useMemo(
    () => (showAside ? entries : entries.filter((entry) => !entry.isAside)),
    [entries, showAside],
  );
  const pages = useMemo(() => paginateEntries(visibleEntries), [visibleEntries]);
  const effectivePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[effectivePageIndex] ?? [];

  useEffect(() => {
    if (!restoredPageRef.current) {
      restoredPageRef.current = true;
      return;
    }

    const handleBeforeUnload = () => {
      window.sessionStorage.setItem(
        RELOAD_STORAGE_KEY,
        JSON.stringify({
          htmlUrl,
          pageIndex: effectivePageIndex,
        }),
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    };
  }, [effectivePageIndex, htmlUrl]);

  useEffect(() => {
    if (!shouldScrollToReaderRef.current) return;

    shouldScrollToReaderRef.current = false;
    readerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [effectivePageIndex]);

  const moveToPage = (nextPageIndex: number) => {
    shouldScrollToReaderRef.current = true;
    setPageIndex(nextPageIndex);
  };

  if (html === null) {
    return (
      <div className="afterroll-note flex min-h-[28rem] items-center justify-center text-[1.02rem] text-[var(--ledger-muted)]">
        Loading archive...
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="afterroll-note flex min-h-[28rem] items-center justify-center text-[1.02rem] text-[var(--ledger-muted)]">
        No readable messages found.
      </div>
    );
  }

  return (
    <section ref={readerRef} className="trpg-log-reader px-[0.75rem] py-[0.9rem] md:px-[1.25rem] md:py-[1.25rem]">
      <PageNav
        pageIndex={effectivePageIndex}
        pageCount={pages.length}
        onFirst={() => moveToPage(0)}
        onLast={() => moveToPage(Math.max(0, pages.length - 1))}
        onPrev={() => moveToPage(Math.max(0, effectivePageIndex - 1))}
        onNext={() => moveToPage(Math.min(pages.length - 1, effectivePageIndex + 1))}
        onSelect={(value) => moveToPage(value)}
      />

      <div className="ledger-paper-sheet paper-memo mt-[0.65rem] flex items-center justify-between gap-[1rem] rounded-[0.55rem] px-[0.9rem] py-[0.8rem] text-[0.8rem] text-[var(--ledger-muted)]">
        <p className="afterroll-meta relative z-[1] text-[0.84rem] uppercase tracking-[0.12em]">{visibleEntries.length} entries</p>
        <label className="relative z-[1] inline-flex items-center gap-[0.5rem]">
          <input
            type="checkbox"
            checked={showAside}
            onChange={(event) => setShowAside(event.target.checked)}
            className="h-[0.95rem] w-[0.95rem]"
          />
          <span className="afterroll-meta text-[0.84rem] uppercase tracking-[0.08em]">Aside</span>
        </label>
      </div>

      <div className="mt-[0.7rem] space-y-[0.4rem]">
        {currentPage.map((entry) => (
          <article
            key={entry.id}
            className={
              entry.kind === 'media'
                ? 'ledger-paper-sheet paper-plain rounded-[0.55rem] p-[0.55rem] md:p-[0.65rem]'
                : `ledger-paper-sheet paper-memo grid grid-cols-[2.35rem_minmax(0,1fr)] gap-[0.65rem] rounded-[0.55rem] p-[0.55rem] md:grid-cols-[2.6rem_minmax(0,1fr)] md:p-[0.65rem] ${
                    entry.isAside ? 'opacity-75' : ''
                  }`
            }
          >
            {entry.kind === 'media' ? (
              <div className="ledger-typed-box paper-plain relative z-[1] rounded-[0.45rem] px-[0.55rem] py-[0.55rem] md:px-[0.7rem] md:py-[0.7rem]">
                <div
                  className="trpg-media-bubble overflow-hidden rounded-[0.45rem] bg-[#fbf7ef]"
                  dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
                />
              </div>
            ) : (
              <>
                <div className="relative z-[1] flex flex-col items-center justify-start pt-[0.1rem]">
                  {entry.avatarSrc || fallbackAvatarSrc ? (
                    <Image
                      src={entry.avatarSrc || fallbackAvatarSrc || ''}
                      alt={entry.speaker || 'Narration'}
                      width={41}
                      height={41}
                      className="h-[2.35rem] w-[2.35rem] rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] object-cover p-[0.12rem] md:h-[2.55rem] md:w-[2.55rem]"
                    />
                  ) : (
                    <div className="flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] text-[0.46rem] uppercase tracking-[0.08em] text-black/35 md:h-[2.55rem] md:w-[2.55rem]">
                      Log
                    </div>
                  )}
                </div>

                <div className="relative z-[1] flex min-h-full min-w-0 flex-col justify-center">
                  {entry.speaker ? (
                     <p className="afterroll-meta mb-[0.34rem] px-[0.05rem] text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ledger-soft)] md:text-[0.76rem]">
                       {entry.speaker}
                     </p>
                   ) : (
                     <div className="mb-[0.34rem]" />
                   )}
                  <div
                    className={`ledger-typed-box paper-plain afterroll-body min-w-0 overflow-x-auto overflow-y-hidden rounded-[0.45rem] px-[0.7rem] py-[0.62rem] text-[0.92rem] leading-[1.72] md:px-[0.85rem] md:py-[0.72rem] ${
                      entry.isWhisper
                        ? 'trpg-entry-whisper border border-[rgba(116,145,104,0.24)] text-black/72'
                        : entry.isAside
                          ? 'trpg-entry-aside text-black/44'
                          : 'trpg-entry-general text-black/78'
                    }`}
                  >
                    {entry.isWhisper ? (
                      <p className="afterroll-meta mb-[0.34rem] text-[0.68rem] uppercase tracking-[0.14em] text-[rgba(82,112,71,0.76)]">
                        Whisper
                      </p>
                    ) : null}
                    <div className="min-w-0" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>

      <PageNav
        pageIndex={effectivePageIndex}
        pageCount={pages.length}
        onFirst={() => moveToPage(0)}
        onLast={() => moveToPage(Math.max(0, pages.length - 1))}
        onPrev={() => moveToPage(Math.max(0, effectivePageIndex - 1))}
        onNext={() => moveToPage(Math.min(pages.length - 1, effectivePageIndex + 1))}
        onSelect={(value) => moveToPage(value)}
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
          border-radius: 0.12rem;
          object-fit: contain;
        }

        .trpg-log-reader .trpg-entry-general {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(245, 243, 239, 0.98)) !important;
        }

        .trpg-log-reader .trpg-entry-aside {
          background: linear-gradient(180deg, rgba(253, 251, 247, 0.96), rgba(244, 241, 235, 0.94)) !important;
          border-color: rgba(94, 70, 45, 0.07) !important;
        }

        .trpg-log-reader .trpg-entry-whisper {
          background: linear-gradient(180deg, rgba(231, 243, 230, 0.98), rgba(217, 234, 214, 0.96)) !important;
          border-color: rgba(116, 145, 104, 0.28) !important;
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
    <div className="ledger-paper-sheet paper-grid mt-[0.35rem] flex items-center justify-between gap-[1rem] rounded-[0.55rem] px-[0.9rem] py-[0.75rem] text-[0.84rem] text-[var(--ledger-muted)]">
      <div className="relative z-[1] flex items-center gap-[0.4rem]">
        <button
          type="button"
          onClick={onFirst}
          disabled={pageIndex === 0}
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          First
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={pageIndex === 0}
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Prev
        </button>
      </div>

      <div className="relative z-[1] flex items-center gap-[0.35rem]">
        {pages.map((value) => {
          const active = value === pageIndex;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={`afterroll-meta min-w-[2rem] rounded-[0.15rem] px-[0.6rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors ${
                active ? 'ledger-index-tab-active' : 'ledger-index-tab hover:bg-[rgba(236,220,194,0.96)]'
              }`}
            >
              {value + 1}
            </button>
          );
        })}
      </div>

      <div className="relative z-[1] flex items-center gap-[0.4rem]">
        <button
          type="button"
          onClick={onNext}
          disabled={pageIndex >= pageCount - 1}
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={pageIndex >= pageCount - 1}
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Last
        </button>
      </div>
    </div>
  );
}
