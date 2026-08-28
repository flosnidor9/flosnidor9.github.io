'use client';

import DOMPurify from 'dompurify';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { TrpgCastEntry } from '@/lib/data/trpg';
import { expandCcaArchive } from '@/lib/ccaArchive';

type Props = {
  htmlUrl?: string;
  htmlContent?: string;
  fallbackAvatarSrc?: string;
  gmName?: string;
  cast?: TrpgCastEntry[];
  mainChannels?: string[];
  whisperChannels?: string[];
};

type LogEntry = {
  id: string;
  speaker: string;
  whisperFrom?: string;
  whisperTo?: string;
  avatarSrc: string | null;
  contentHtml: string;
  isAside: boolean;
  isWhisper: boolean;
  isNarrator?: boolean;
  kind: 'chat' | 'media';
};

const LOG_FONT_OPTIONS = [
  { value: 'default', label: '기본', fontFamily: 'var(--atr-font-ui)' },
  { value: 'sans', label: '고딕', fontFamily: 'var(--font-sans)' },
  { value: 'serif', label: '명조', fontFamily: 'var(--font-serif)' },
  { value: 'hand', label: '손글씨', fontFamily: 'var(--font-hand)' },
] as const;

type LogFontValue = (typeof LOG_FONT_OPTIONS)[number]['value'];

const MAX_PAGE_ENTRIES = 80;
const MAX_PAGE_WEIGHT = 120000;
const RELOAD_STORAGE_KEY = 'trpg-log-reader-reload';
const PORTRAIT_CROP_RATIO = 1.15;
const EMPTY_LOG_ENTRIES: LogEntry[] = [];

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html);
}

function detectFormat(html: string): 'icecandy-roll20' | 'roll20' | 'ccfolia' | 'cca' {
  if (/class=["'][^"']*icecandy-export/.test(html) && /data-skin=["']roll20/.test(html)) return 'icecandy-roll20';
  if (/class="cca-wrap"/.test(html) || (/class=["'][^"']*\br\s+row\b/.test(html) && /class=["'][^"']*\bc\b/.test(html))) return 'cca';
  if (/class="message\s/i.test(html)) return 'roll20';
  return 'ccfolia';
}

function normalizeChannel(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function getCcaTabName(node: Element): string {
  return normalizeChannel(node.closest('details.fold')?.querySelector('summary')?.textContent);
}

function parseCcaEntries(html: string, avatarMap: Record<string, string>, whisperChannels: string[]): LogEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<html><body>${html}</body></html>`, 'text/html');
  const compressedRows = Array.from(doc.querySelectorAll<HTMLElement>('div.r.row'));
  if (compressedRows.length > 0) {
    return compressedRows
      .map((row, index): LogEntry | null => {
        const copy = row.querySelector<HTMLElement>('.c');
        const narratorText = row.querySelector<HTMLElement>('.nt');
        const tabName = getCcaTabName(row);
        const isWhisper = whisperChannels.includes(tabName);
        if (!copy && !narratorText) return null;

        if (narratorText) {
          const contentHtml = sanitizeHtml(narratorText.innerHTML.trim());
          if (!contentHtml) return null;
          return {
            id: `cca-archive-${index}`,
            speaker: '',
            avatarSrc: null,
            contentHtml,
            isAside: false,
            isWhisper,
            whisperTo: tabName || undefined,
            isNarrator: true,
            kind: 'media',
          };
        }

        const speaker = copy?.querySelector('header b')?.textContent?.trim() ?? '';
        const content = copy?.cloneNode(true) as HTMLElement | undefined;
        content?.querySelector('header')?.remove();
        const contentHtml = sanitizeHtml(content?.innerHTML.trim() ?? '');
        if (!contentHtml) return null;

        return {
          id: `cca-archive-${index}`,
          speaker,
          avatarSrc: row.querySelector('img')?.getAttribute('src') ?? avatarMap[speaker] ?? null,
          contentHtml,
          isAside: row.closest('details') !== null,
          isWhisper,
          whisperTo: tabName || undefined,
          kind: 'chat',
        };
      })
      .filter((entry): entry is LogEntry => Boolean(entry));
  }

  const articles = Array.from(doc.querySelectorAll('article.row'));
  const entries: LogEntry[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const isAside = article.closest('details.fold') !== null;
    const tabName = getCcaTabName(article);
    const isWhisper = whisperChannels.includes(tabName);

    if (article.classList.contains('narrator')) {
      const narratorText = article.querySelector('.narrator-text');
      if (!narratorText) continue;
      const contentHtml = sanitizeHtml(narratorText.innerHTML.trim());
      if (!contentHtml) continue;
      entries.push({
        id: `cca-${i}`,
        speaker: '',
        avatarSrc: null,
        contentHtml,
        isAside,
        isWhisper,
        whisperTo: tabName || undefined,
        isNarrator: true,
        kind: 'media',
      });
      continue;
    }

    if (article.classList.contains('dice-result-row')) {
      const speaker = article.querySelector('.dice-result-card b')?.textContent?.trim() ?? '';
      const diceBox = article.querySelector('.dice-roll-box');
      if (!diceBox) continue;
      entries.push({
        id: `cca-${i}`,
        speaker,
        avatarSrc: avatarMap[speaker] ?? null,
        contentHtml: sanitizeHtml(diceBox.outerHTML),
        isAside,
        isWhisper,
        whisperTo: tabName || undefined,
        kind: 'chat',
      });
      continue;
    }

    const speaker = article.querySelector('.copy header b')?.textContent?.trim() ?? '';
    const contentDiv = article.querySelector('.copy > div');
    if (!contentDiv) continue;
    const contentHtml = sanitizeHtml(contentDiv.innerHTML.trim());
    if (!contentHtml) continue;
    const avatarSrc = article.querySelector('.portrait img')?.getAttribute('src') ?? avatarMap[speaker] ?? null;

    entries.push({
      id: `cca-${i}`,
      speaker,
      avatarSrc,
      contentHtml,
      isAside,
      isWhisper,
      whisperTo: tabName || undefined,
      kind: 'chat',
    });
  }

  return entries;
}

function buildAvatarMap(
  gmName: string | undefined,
  fallbackAvatarSrc: string | undefined,
  cast: TrpgCastEntry[] | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (gmName && fallbackAvatarSrc) map[gmName] = fallbackAvatarSrc;
  if (cast) {
    for (const entry of cast) {
      if (entry.iconSrc) {
        if (entry.pcName) map[entry.pcName] = entry.iconSrc;
        if (entry.plName) map[entry.plName] = entry.iconSrc;
      }
    }
  }
  return map;
}

function parseCcfoliaEntries(html: string, avatarMap: Record<string, string>, mainChannels: string[], whisperChannels: string[]): LogEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<html><body>${html}</body></html>`, 'text/html');
  const paragraphs = Array.from(doc.querySelectorAll('body > p[style]'));

  const parsed: LogEntry[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const node = paragraphs[i];
    const spans = Array.from(node.querySelectorAll('span'));
    if (spans.length < 3) continue;

    const channelText = spans[0]?.textContent?.trim() ?? '';
    const channelMatch = channelText.match(/^\[\s*(.*?)\s*\]$/);
    const channel = normalizeChannel(channelMatch?.[1]);
    const isWhisper = whisperChannels.includes(channel);

    const speaker = spans[1]?.textContent?.trim() ?? '';
    const contentSpan = spans[2];
    if (!contentSpan) continue;

    const contentHtml = sanitizeHtml(contentSpan.innerHTML.trim());
    if (!contentHtml) continue;

    parsed.push({
      id: `ccfolia-${i}`,
      speaker,
      avatarSrc: avatarMap[speaker] ?? null,
      contentHtml,
      isAside: !mainChannels.includes(channel),
      isWhisper,
      whisperTo: isWhisper ? channel : undefined,
      kind: 'chat',
    });
  }

  const ccaNarrators = Array.from(doc.querySelectorAll('article.row.narrator .narrator-text'));
  for (let i = 0; i < ccaNarrators.length; i++) {
    const contentHtml = sanitizeHtml(ccaNarrators[i].innerHTML.trim());
    if (!contentHtml) continue;

    parsed.push({
      id: `cca-narrator-${i}`,
      speaker: '',
      avatarSrc: null,
      contentHtml,
      isAside: false,
      isWhisper: false,
      isNarrator: true,
      kind: 'media',
    });
  }

  return parsed;
}

function normalizeSpeaker(raw: string | null | undefined): string {
  return (raw ?? '').replace(/:\s*$/, '').trim();
}

function getWhisperParticipants(node: Element, fallbackFrom: string): { from: string; to: string } {
  const from = normalizeSpeaker(node.querySelector('.from')?.textContent) || fallbackFrom;
  const to = normalizeSpeaker(node.querySelector('.to')?.textContent);

  if (to) return { from, to };

  const byText = normalizeSpeaker(node.querySelector('.by')?.textContent);
  const match = byText.match(/^(.+?)\s*(?:to|→|->)\s*(.+)$/i);
  return match ? { from: normalizeSpeaker(match[1]), to: normalizeSpeaker(match[2]) } : { from, to: '' };
}

function isAsideMessage(node: Element): boolean {
  return Boolean(
    node.querySelector(
      'span[style*="color: rgb(170, 170, 170)"], span[style*="color:rgb(170,170,170)"]',
    ),
  );
}

function getBackgroundImageSource(element: Element | null): string | null {
  const style = element?.getAttribute('style') ?? '';
  const match = style.match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i);
  return match?.[1] ?? null;
}

function getAvatarSource(node: Element): string | null {
  const avatar = node.querySelector('.avatar');
  return avatar?.querySelector('img')?.getAttribute('src') ?? getBackgroundImageSource(avatar);
}

function getIcecandyImageSources(html: string) {
  const sources = new Map<string, string>();
  const pattern = /\.([\w-]+)\s*\{[^}]*?background-image\s*:\s*url\(["']?(data:image\/[^"')]+)["']?\)/gi;

  for (const match of html.matchAll(pattern)) {
    const className = match[1];
    const source = match[2];
    if (className && source) sources.set(className, source);
  }

  return sources;
}

function replaceIcecandyBackgroundImages(node: HTMLElement, imageSources: Map<string, string>) {
  for (const element of Array.from(node.querySelectorAll<HTMLElement>('span'))) {
    const source = Array.from(element.classList)
      .map((className) => imageSources.get(className))
      .find((value): value is string => Boolean(value));
    if (!source) continue;

    const image = element.ownerDocument.createElement('img');
    image.src = source;
    image.alt = element.getAttribute('aria-label') || 'Log image';
    if (element.style.width) image.style.width = element.style.width;
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
    element.replaceWith(image);
  }
}

function parseIcecandyRoll20Entries(html: string): LogEntry[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const imageSources = getIcecandyImageSources(html);

  return Array.from(document.querySelectorAll<HTMLElement>('[data-entry-id]'))
    .map((node, index): LogEntry | null => {
      const clone = node.cloneNode(true) as HTMLElement;
      const containsImage = Array.from(clone.querySelectorAll<HTMLElement>('span')).some((element) =>
        Array.from(element.classList).some((className) => imageSources.has(className)),
      );
      replaceIcecandyBackgroundImages(clone, imageSources);

      const speaker = node.querySelector('[class~="float-left"] > span.text-foreground')?.textContent?.trim() ?? '';
      clone.querySelectorAll('[class~="float-left"]').forEach((element) => element.remove());
      const contentHtml = sanitizeHtml(clone.innerHTML.trim());
      if (!contentHtml) return null;

      return {
        id: `icecandy-${index}`,
        speaker,
        avatarSrc: null,
        contentHtml,
        isAside: false,
        isWhisper: false,
        kind: containsImage ? 'media' : 'chat',
      };
    })
    .filter((entry): entry is LogEntry => Boolean(entry));
}

function resolveSourceAssetUrls(node: HTMLElement, htmlUrl: string | undefined) {
  if (!htmlUrl) return;
  const baseUrl = new URL(htmlUrl, window.location.origin);
  for (const element of Array.from(node.querySelectorAll<HTMLElement>('[src], [href]'))) {
    for (const attribute of ['src', 'href']) {
      const value = element.getAttribute(attribute);
      if (!value || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(value)) continue;
      element.setAttribute(attribute, new URL(value, baseUrl).toString());
    }
  }
}

function parseEntries(html: string, htmlUrl?: string): LogEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const nodes = Array.from(doc.querySelectorAll('.message.general, .message.desc, .message.private, .message.emote'));
  const parsed = nodes
    .map((node, index): LogEntry | null => {
      const isMedia = node.classList.contains('desc') || node.classList.contains('emote');
      const isWhisper = node.classList.contains('private') || node.classList.contains('whisper');
      const originalSpeaker = normalizeSpeaker(node.querySelector('.by')?.textContent);
      const whisperParticipants = isWhisper ? getWhisperParticipants(node, originalSpeaker) : null;
      const speaker = whisperParticipants?.from || originalSpeaker;
      const avatarSrc = getAvatarSource(node);
      const clone = node.cloneNode(true) as HTMLElement;
      const isAside = isAsideMessage(node);

      resolveSourceAssetUrls(clone, htmlUrl);

      clone.querySelectorAll('.avatar, .by, .spacer, br.Apple-interchange-newline').forEach((element) => {
        element.remove();
      });

      const contentHtml = sanitizeHtml(clone.innerHTML.trim());
      if (!contentHtml) return null;

      return {
        id: `${speaker}-${index}`,
        speaker,
        avatarSrc,
        contentHtml,
        isAside,
        isWhisper,
        whisperFrom: whisperParticipants?.from,
        whisperTo: whisperParticipants?.to,
        kind: isMedia ? 'media' : 'chat',
      };
    })
    .filter((entry): entry is LogEntry => Boolean(entry));

  // Keep each source message as an entry. Merging consecutive messages makes
  // the page limit apply to speaker groups rather than to actual dialogue lines.
  return parsed;
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

function wrapPortraitLogImage(img: HTMLImageElement) {
  if (img.closest('.trpg-portrait-frame')) return;
  if (!img.naturalWidth || !img.naturalHeight) return;
  if (img.naturalHeight / img.naturalWidth < PORTRAIT_CROP_RATIO) return;

  const frame = document.createElement('span');
  frame.className = 'trpg-portrait-frame';
  img.parentNode?.insertBefore(frame, img);
  frame.appendChild(img);
}

export default function TrpgLogReader({ htmlUrl, htmlContent, fallbackAvatarSrc, gmName, cast, mainChannels = ['main'], whisperChannels = [] }: Props) {
  const [html, setHtml] = useState<string | null>(htmlContent ?? null);
  const [pageIndex, setPageIndex] = useState(0);
  const [showAside, setShowAside] = useState(true);
  const [logFont, setLogFont] = useState<LogFontValue>('default');
  const readerRef = useRef<HTMLElement | null>(null);
  const restoredPageRef = useRef(false);
  const shouldScrollToReaderRef = useRef(false);

  const avatarMap = useMemo(
    () => buildAvatarMap(gmName, fallbackAvatarSrc, cast),
    [gmName, fallbackAvatarSrc, cast],
  );

  useEffect(() => {
    restoredPageRef.current = false;
    shouldScrollToReaderRef.current = false;
    let cancelled = false;
    const restorePageIndex = (nextPageIndex: number) => {
      queueMicrotask(() => {
        if (!cancelled) setPageIndex(nextPageIndex);
      });
    };

    const savedReloadState = window.sessionStorage.getItem(RELOAD_STORAGE_KEY);
    if (!savedReloadState) {
      restorePageIndex(0);
      return () => {
        cancelled = true;
      };
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

    restorePageIndex(Number.isNaN(parsedPageIndex) ? 0 : Math.max(0, parsedPageIndex));

    return () => {
      cancelled = true;
    };
  }, [htmlUrl]);

  useEffect(() => {
    if (htmlContent !== undefined || !htmlUrl) return;

    const controller = new AbortController();

    fetch(htmlUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then((text) => expandCcaArchive(text))
      .then((text) => {
        setHtml(text);
      })
      .catch(() => {
        setHtml('');
      });

    return () => controller.abort();
  }, [htmlUrl, htmlContent]);

  const entries = useMemo(() => {
    if (!html) return [];
    const format = detectFormat(html);
    if (format === 'icecandy-roll20') return parseIcecandyRoll20Entries(html);
    const normalizedMainChannels = mainChannels.map(normalizeChannel);
    const normalizedWhisperChannels = whisperChannels.map(normalizeChannel);
    if (format === 'cca') return parseCcaEntries(html, avatarMap, normalizedWhisperChannels);
    if (format === 'ccfolia') return parseCcfoliaEntries(html, avatarMap, normalizedMainChannels, normalizedWhisperChannels);
    return parseEntries(html, htmlUrl);
  }, [html, avatarMap, mainChannels, whisperChannels, htmlUrl]);
  const visibleEntries = useMemo(
    () => (showAside ? entries : entries.filter((entry) => !entry.isAside)),
    [entries, showAside],
  );
  const pages = useMemo(() => paginateEntries(visibleEntries), [visibleEntries]);
  const effectivePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const currentPage = useMemo(() => pages[effectivePageIndex] ?? EMPTY_LOG_ENTRIES, [effectivePageIndex, pages]);
  const selectedLogFont = LOG_FONT_OPTIONS.find((option) => option.value === logFont) ?? LOG_FONT_OPTIONS[0];
  const readerStyle = {
    '--trpg-log-font-family': selectedLogFont.fontFamily,
  } as CSSProperties;

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

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;

    const images = Array.from(
      reader.querySelectorAll<HTMLImageElement>('.trpg-entry-content img, .trpg-media-bubble img'),
    );
    const cleanups: Array<() => void> = [];

    for (const img of images) {
      if (img.complete) {
        wrapPortraitLogImage(img);
        continue;
      }

      const handleLoad = () => wrapPortraitLogImage(img);
      img.addEventListener('load', handleLoad, { once: true });
      cleanups.push(() => img.removeEventListener('load', handleLoad));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [currentPage, effectivePageIndex]);

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
    <section
      ref={readerRef}
      className="trpg-log-reader px-[0.75rem] py-[0.9rem] md:px-[1.25rem] md:py-[1.25rem]"
      style={readerStyle}
    >
      <PageNav
        pageIndex={effectivePageIndex}
        pageCount={pages.length}
        onFirst={() => moveToPage(0)}
        onLast={() => moveToPage(Math.max(0, pages.length - 1))}
        onPrev={() => moveToPage(Math.max(0, effectivePageIndex - 1))}
        onNext={() => moveToPage(Math.min(pages.length - 1, effectivePageIndex + 1))}
        onSelect={(value) => moveToPage(value)}
      />

      <div className="trpg-reader-toolbar ledger-paper-sheet mt-[0.65rem] flex items-center justify-between gap-[1rem] px-[0.9rem] py-[0.8rem] text-[0.8rem] text-[var(--ledger-muted)]">
        <p className="afterroll-meta relative z-[1] text-[0.84rem] uppercase tracking-[0.12em]">{visibleEntries.length} transcript lines</p>
        <div className="relative z-[1] flex flex-wrap items-center justify-end gap-[0.65rem]">
          <label className="inline-flex items-center gap-[0.45rem]">
            <span className="afterroll-meta text-[0.84rem] tracking-[0.08em]">글씨체</span>
            <select
              value={logFont}
              onChange={(event) => setLogFont(event.target.value as LogFontValue)}
              className="afterroll-meta min-w-[5.6rem] border border-[var(--atr-line)] bg-transparent px-[0.45rem] py-[0.28rem] text-[0.8rem] text-[var(--ledger-muted)]"
              aria-label="로그 글씨체"
            >
              {LOG_FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-[0.5rem]">
            <input
              type="checkbox"
              checked={showAside}
              onChange={(event) => setShowAside(event.target.checked)}
              className="h-[0.95rem] w-[0.95rem]"
            />
            <span className="afterroll-meta text-[0.84rem] tracking-[0.08em]">사담</span>
          </label>
        </div>
      </div>

      <div className="mt-[0.7rem]">
        {currentPage.map((entry) => (
          <article
            key={entry.id}
            className={
              entry.kind === 'media'
                ? 'trpg-log-row trpg-log-media-row px-[0.25rem] py-[0.5rem] text-center md:px-[0.35rem] md:py-[0.6rem]'
                : `trpg-log-row grid grid-cols-[3.75rem_minmax(0,1fr)] gap-[0.65rem] px-[0.25rem] py-[0.5rem] md:grid-cols-[4.1rem_minmax(0,1fr)] md:px-[0.35rem] md:py-[0.6rem] ${
                    entry.isAside ? 'trpg-log-row-aside' : ''
                  } ${entry.isWhisper ? 'trpg-log-row-whisper' : ''}`
            }
          >
            {entry.kind === 'media' ? (
              <div className="relative z-[1] px-[0.05rem] py-[0.05rem] md:px-[0.08rem] md:py-[0.08rem]">
                <div
                  className={`trpg-media-bubble overflow-hidden ${entry.isNarrator ? 'trpg-cca-narrator' : ''}`}
                  dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
                />
              </div>
            ) : (
              <>
                <div className="relative z-[1] flex flex-col items-center justify-start pt-[0.1rem]">
                  {entry.avatarSrc || fallbackAvatarSrc ? (
                    <div className="h-[3.75rem] w-[3.75rem] overflow-hidden rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] p-[0.12rem] md:h-[4.1rem] md:w-[4.1rem]">
                      {/* Roll20 avatar URLs are runtime external sources, so Next Image cannot optimize them safely. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.avatarSrc || fallbackAvatarSrc || ''}
                        alt={entry.speaker || 'Narration'}
                        className="h-full w-full scale-[1.08] rounded-[0.12rem] object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] text-[0.55rem] uppercase tracking-[0.08em] text-black/35 md:h-[4.1rem] md:w-[4.1rem]">
                      Log
                    </div>
                  )}
                </div>

                <div className="relative z-[1] flex min-h-full min-w-0 flex-col justify-center">
                  {entry.speaker ? (
                     <p className="trpg-speaker-name afterroll-meta mb-[0.34rem] px-[0.05rem] text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ledger-soft)] md:text-[0.76rem]">
                       {entry.speaker}
                     </p>
                   ) : (
                     <div className="mb-[0.34rem]" />
                   )}
                  <div
                    className={`trpg-entry-bubble afterroll-body min-w-0 overflow-x-auto overflow-y-hidden rounded-[0.12rem] px-[0.05rem] py-[0.08rem] text-[0.92rem] leading-[1.72] md:px-[0.08rem] md:py-[0.1rem] ${
                      entry.isWhisper
                        ? 'trpg-entry-whisper text-black/72'
                        : entry.isAside
                          ? 'trpg-entry-aside text-black/72'
                          : 'trpg-entry-general text-black/78'
                    }`}
                  >
                    {entry.isWhisper ? (
                      <p className="afterroll-meta mb-[0.34rem] text-[0.68rem] uppercase tracking-[0.1em] text-[var(--atr-text)]">
                        TO {entry.whisperTo || 'UNKNOWN'}
                      </p>
                    ) : null}
                    <div className="trpg-entry-content min-w-0" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
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

        .trpg-log-reader .trpg-entry-content,
        .trpg-log-reader .trpg-entry-content *,
        .trpg-log-reader .trpg-media-bubble,
        .trpg-log-reader .trpg-media-bubble *,
        .trpg-log-reader .trpg-speaker-name {
          font-family: var(--trpg-log-font-family) !important;
        }

        .trpg-log-reader .trpg-log-row {
          border-bottom: 0.05rem solid rgba(88, 125, 163, 0.18);
          background: transparent !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        .trpg-log-reader .trpg-log-row-aside {
          border-left: 0.16rem solid rgba(104, 116, 128, 0.24);
          background: rgba(104, 116, 128, 0.035) !important;
          padding-left: 0.55rem;
        }

        .trpg-log-reader .trpg-log-row-whisper {
          border-left: 0.16rem solid rgba(157, 79, 118, 0.42);
          background: rgba(227, 190, 210, 0.14) !important;
          padding-left: 0.55rem;
        }

        .trpg-log-reader .trpg-log-row:first-child {
          border-top: 0.05rem solid rgba(88, 125, 163, 0.12);
        }

        .trpg-log-reader .trpg-media-bubble a {
          display: block;
          width: 100%;
        }

        .trpg-log-reader .trpg-cca-narrator,
        .trpg-log-reader .trpg-cca-narrator * {
          background: transparent !important;
          box-shadow: none !important;
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

        .trpg-log-reader .trpg-portrait-frame {
          display: block;
          width: 100%;
          max-width: min(100%, 36rem);
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 0.16rem;
          background: rgba(251, 252, 253, 0.9);
        }

        .trpg-log-reader .trpg-portrait-frame img {
          width: 100% !important;
          max-width: none !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center top !important;
        }

        .trpg-log-reader .trpg-entry-general {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .trpg-log-reader .trpg-entry-aside {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .trpg-log-reader .trpg-entry-whisper {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
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
    <div className="trpg-page-nav ledger-paper-sheet mt-[0.35rem] flex flex-wrap items-center justify-center gap-[0.35rem] px-[0.9rem] py-[0.75rem] text-[0.84rem] text-[var(--ledger-muted)]">
      <div className="relative z-[1] flex items-center gap-[0.35rem]">
        <button
          type="button"
          onClick={onFirst}
          disabled={pageIndex === 0}
          aria-label="First page"
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          IN
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={pageIndex === 0}
          aria-label="Previous page"
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          PREV
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
              {String(value + 1).padStart(2, '0')}
            </button>
          );
        })}
      </div>

      <div className="relative z-[1] flex items-center gap-[0.35rem]">
        <button
          type="button"
          onClick={onNext}
          disabled={pageIndex >= pageCount - 1}
          aria-label="Next page"
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          NEXT
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={pageIndex >= pageCount - 1}
          aria-label="Last page"
          className="ledger-index-tab afterroll-meta rounded-[0.15rem] px-[0.7rem] py-[0.35rem] text-[0.82rem] uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(236,220,194,0.96)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          OUT
        </button>
      </div>
    </div>
  );
}
