'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type MouseEvent, type PointerEvent } from 'react';
import type { TrpgCastEntry } from '@/lib/data/trpg';

type Props = {
  gmName: string;
  gmIconSrc: string;
  cast: TrpgCastEntry[];
};

type CastCard = {
  id: string;
  primaryLabel: string;
  secondaryLabel: string;
  iconSrc: string;
  tone: 'gm' | 'cast';
};

type ActivePreview = {
  card: CastCard;
  x: number;
  y: number;
};

function buildCards(gmName: string, gmIconSrc: string, cast: TrpgCastEntry[]): CastCard[] {
  const cards: CastCard[] = [];

  if (gmName) {
    cards.push({
      id: `gm-${gmName}`,
      primaryLabel: gmName,
      secondaryLabel: 'GM',
      iconSrc: gmIconSrc,
      tone: 'gm',
    });
  }

  for (const entry of cast) {
    cards.push({
      id: `${entry.plName}-${entry.pcName}`,
      primaryLabel: entry.plName,
      secondaryLabel: entry.pcName,
      iconSrc: entry.iconSrc,
      tone: 'cast',
    });
  }

  return cards;
}

function clampPoint(x: number, y: number) {
  if (typeof window === 'undefined') return { x, y };

  const padding = 32;

  return {
    x: Math.min(Math.max(x, padding), window.innerWidth - padding),
    y: Math.min(Math.max(y, padding), window.innerHeight - padding),
  };
}

export default function TrpgCastPanel({ gmName, gmIconSrc, cast }: Props) {
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);
  const cards = useMemo(() => buildCards(gmName, gmIconSrc, cast), [cast, gmIconSrc, gmName]);

  useEffect(() => {
    if (!activePreview) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePreview(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activePreview]);

  if (cards.length === 0) return null;

  const openPreview = (card: CastCard, clientX: number, clientY: number) => {
    setActivePreview({
      card,
      ...clampPoint(clientX, clientY),
    });
  };

  const handlePointerOpen = (card: CastCard) => (event: PointerEvent<HTMLButtonElement>) => {
    openPreview(card, event.clientX, event.clientY);
  };

  const handleKeyboardOpen = (card: CastCard) => (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;
    openPreview(card, window.innerWidth / 2, window.innerHeight / 2);
  };

  return (
    <>
      <div className="ledger-paper-sheet relative mt-[1rem] rounded-[0.35rem] px-[0.9rem] py-[0.85rem]">
        <p className="afterroll-meta relative z-[1] text-[0.86rem] uppercase tracking-[0.16em] text-[var(--ledger-soft)]">
          Cast Channel
        </p>

        <div className="relative z-[1] mt-[0.75rem] grid grid-cols-[repeat(auto-fit,minmax(7.4rem,1fr))] gap-[0.5rem] md:grid-cols-[repeat(auto-fit,minmax(8.2rem,1fr))]">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onPointerUp={handlePointerOpen(card)}
              onClick={handleKeyboardOpen(card)}
              className="ledger-typed-box flex min-h-[10rem] flex-col items-center rounded-[0.3rem] px-[0.55rem] py-[0.55rem] text-center transition duration-200 hover:border-[var(--atr-line-strong)] hover:shadow-[0_0_1.2rem_rgba(88, 125, 163,0.12)]"
              aria-label={`${card.primaryLabel} icon preview open`}
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-[0.45rem]">
                {card.iconSrc ? (
                  <Image
                    src={card.iconSrc}
                    alt={card.primaryLabel}
                    width={96}
                    height={96}
                    className="h-[6rem] w-[6rem] rounded-[0.2rem] border border-[var(--atr-line)] object-cover object-top p-[0.12rem] shadow-[0_0_1rem_rgba(88, 125, 163,0.12)]"
                  />
                ) : (
                  <div
                    className={`flex h-[6rem] w-[6rem] items-center justify-center rounded-[0.2rem] border border-[var(--atr-line)] shadow-[0_0_1rem_rgba(88, 125, 163,0.12)] ${
                      card.tone === 'gm'
                        ? 'bg-[rgba(127,79,42,0.08)] text-[var(--ledger-accent)]'
                        : 'bg-[rgba(141,151,161,0.1)] text-[var(--atr-accent)]'
                    }`}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      {card.tone === 'gm' ? (
                        <path d="M12 3l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 3z" />
                      ) : (
                        <>
                          <circle cx="12" cy="8" r="3.2" />
                          <path d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
                        </>
                      )}
                    </svg>
                  </div>
                )}
                <div className="min-w-0 space-y-[0.16rem]">
                  <p className="afterroll-body text-[0.98rem] leading-[1.3] text-[var(--ledger-ink)]">{card.primaryLabel}</p>
                  <p className="afterroll-meta text-[0.82rem] uppercase tracking-[0.12em] text-[var(--ledger-soft)]">
                    {card.secondaryLabel}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activePreview ? (
          <motion.div
            className="fixed inset-0 z-[70] bg-[rgba(0,0,0,0.64)] backdrop-blur-[0.3rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePreview(null)}
          >
            <motion.div
              className="absolute w-[min(20rem,calc(100vw-2rem))] rounded-[0.45rem] border border-[var(--atr-line)] bg-[rgba(251,252,253,0.98)] p-[0.8rem] shadow-[0_1rem_2.4rem_rgba(38,50,60,0.16)]"
              style={{
                left: activePreview.x,
                top: activePreview.y,
                x: '-50%',
                y: '-50%',
              }}
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ledger-paper-sheet flex flex-col items-center rounded-[0.35rem] px-[0.8rem] py-[0.9rem] text-center">
                {activePreview.card.iconSrc ? (
                  <Image
                    src={activePreview.card.iconSrc}
                    alt={activePreview.card.primaryLabel}
                    width={240}
                    height={240}
                    className="h-[min(15rem,58vw)] w-[min(15rem,58vw)] rounded-[0.3rem] border border-[var(--atr-line)] object-cover object-top p-[0.12rem] shadow-[0_0_1.5rem_rgba(88, 125, 163,0.16)]"
                    priority
                  />
                ) : (
                  <div
                    className={`flex h-[min(15rem,58vw)] w-[min(15rem,58vw)] items-center justify-center rounded-[0.3rem] border border-[var(--atr-line)] shadow-[0_0_1.5rem_rgba(88, 125, 163,0.16)] ${
                      activePreview.card.tone === 'gm'
                        ? 'bg-[rgba(127,79,42,0.08)] text-[var(--ledger-accent)]'
                        : 'bg-[rgba(141,151,161,0.1)] text-[var(--atr-accent)]'
                    }`}
                  >
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      {activePreview.card.tone === 'gm' ? (
                        <path d="M12 3l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 3z" />
                      ) : (
                        <>
                          <circle cx="12" cy="8" r="3.2" />
                          <path d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
                        </>
                      )}
                    </svg>
                  </div>
                )}

                <div className="mt-[0.75rem] space-y-[0.18rem]">
                  <p className="afterroll-body text-[1.05rem] leading-[1.3] text-[var(--ledger-ink)]">
                    {activePreview.card.primaryLabel}
                  </p>
                  <p className="afterroll-meta text-[0.82rem] uppercase tracking-[0.14em] text-[var(--ledger-soft)]">
                    {activePreview.card.secondaryLabel}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </>
  );
}
