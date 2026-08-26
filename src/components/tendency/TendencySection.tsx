'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import AdminLoginButton from '@/components/log/AdminLoginButton';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_TENDENCY_PROFILE,
  subscribeToTendencyProfile,
  updateTendencyProfile,
  type TendencyDetailEntry,
  type TendencyItem,
  type TendencyProfile,
  type TendencyProfileInput,
  type TendencyRating,
  type TendencyRule,
  type TendencySection,
  type TendencyTriggerItem,
} from '@/lib/data/firebaseTendency';

const TWITTER_LABEL = 'X / Twitter';

const DETAIL_TABS = [
  { id: 'prepare', label: '준비' },
  { id: 'session', label: '진행' },
  { id: 'roleplay', label: '롤플' },
  { id: 'safety', label: '주의' },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]['id'];

function normalizeTwitterHandle(handle: string) {
  return handle
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '')
    .split(/[/?#]/)[0];
}

function buildTwitterProfileUrl(handle: string) {
  const normalized = normalizeTwitterHandle(handle);
  return normalized ? `https://x.com/${normalized}` : 'https://x.com';
}

function buildTwitterAvatarUrl(handle: string) {
  const normalized = normalizeTwitterHandle(handle);
  return normalized ? `https://unavatar.io/x/${normalized}` : '';
}

function parseItems(value: string): TendencyItem[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|').map((part) => part.trim());
      return rest.length > 0 ? { label, value: rest.join(' | ') } : { label };
    });
}

function stringifyItems(items: TendencyItem[]) {
  return items.map((item) => (item.value ? `${item.label} | ${item.value}` : item.label)).join('\n');
}

function parseRules(value: string): TendencyRule[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', role = '', fluency = '', note = ''] = line
        .split('|')
        .map((part) => part.trim());
      return { name, role, fluency, note };
    })
    .filter((rule) => rule.name);
}

function stringifyRules(rules: TendencyRule[]) {
  return rules
    .map((rule) => [rule.name, rule.role, rule.fluency, rule.note ?? ''].join(' | '))
    .join('\n');
}

function parseRatings(value: string): TendencyRating[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', level = '', note = ''] = line.split('|').map((part) => part.trim());
      return { label, level, note };
    })
    .filter((rating) => rating.label);
}

function stringifyRatings(ratings: TendencyRating[]) {
  return ratings.map((rating) => [rating.label, rating.level, rating.note].join(' | ')).join('\n');
}

function parseDetails(value: string): TendencyDetailEntry[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [category = 'prepare', label = '', gm = '', pl = ''] = line
        .split('|')
        .map((part) => part.trim());
      const safeCategory = ['prepare', 'session', 'roleplay'].includes(category)
        ? (category as TendencyDetailEntry['category'])
        : 'prepare';
      return { category: safeCategory, label, gm, pl };
    })
    .filter((entry) => entry.label);
}

function stringifyDetails(details: TendencyDetailEntry[]) {
  return details
    .map((entry) => [entry.category, entry.label, entry.gm, entry.pl].join(' | '))
    .join('\n');
}

function parseTriggers(value: string): TendencyTriggerItem[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', status = 'ok', note = ''] = line.split('|').map((part) => part.trim());
      const safeStatus = ['ok', 'depict', 'ask', 'no'].includes(status)
        ? (status as TendencyTriggerItem['status'])
        : 'ok';
      return { label, status: safeStatus, note };
    })
    .filter((item) => item.label);
}

function stringifyTriggers(items: TendencyTriggerItem[]) {
  return items.map((item) => [item.label, item.status, item.note ?? ''].join(' | ')).join('\n');
}

function ProfileStamp({ profile }: { profile: TendencyProfile }) {
  const [imageFailed, setImageFailed] = useState(false);
  const handle = normalizeTwitterHandle(profile.handle);
  const avatarSrc = buildTwitterAvatarUrl(handle) || profile.avatarUrl.trim();
  const profileUrl = buildTwitterProfileUrl(handle || profile.handle);

  return (
    <div>
      <div className="relative z-[1] aspect-square overflow-hidden rounded-[0.45rem] border border-[var(--atr-line)] bg-[#fff0f4]">
        {avatarSrc && !imageFailed ? (
          <Image
            src={avatarSrc}
            alt={`${profile.displayName} 인장`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 14rem, 80vw"
            onError={() => setImageFailed(true)}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#fff7fa,#eec6d2)]">
            <span className="text-[3.2rem] font-bold text-[var(--atr-accent)]">
              {profile.displayName.slice(0, 1)}
            </span>
          </div>
        )}
      </div>

      <div className="relative z-[1] mt-[0.85rem]">
        <p className="text-[1.25rem] font-bold leading-tight text-[var(--atr-text)]">
          {profile.displayName}
        </p>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-[0.25rem] inline-flex max-w-full items-center gap-[0.35rem] text-[0.86rem] text-[var(--atr-accent)] underline-offset-[0.18rem] hover:underline"
        >
          <span className="truncate">@{handle || profile.handle}</span>
          <span className="text-[0.68rem] text-[var(--atr-soft)]">{TWITTER_LABEL}</span>
        </a>
      </div>

      {profile.detailTags.length > 0 ? (
        <div className="relative z-[1] mt-[0.75rem] flex flex-wrap gap-[0.32rem]">
          {profile.detailTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[rgba(200,121,147,0.28)] bg-[rgba(255,248,250,0.78)] px-[0.5rem] py-[0.16rem] text-[0.72rem] text-[var(--atr-accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative z-[1] mt-[0.85rem] border-t border-[var(--atr-line)] pt-[0.75rem]">
        <p className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--atr-soft)]">status</p>
        <p className="mt-[0.22rem] text-[0.9rem] leading-[1.55] text-[var(--atr-muted)]">
          {profile.statusLine}
        </p>
      </div>
    </div>
  );
}

function InfoSection({ section }: { section: TendencySection }) {
  return (
    <section className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70">
      <h2 className="border-b border-[var(--atr-line)] px-[0.85rem] py-[0.55rem] text-[0.88rem] font-bold text-[var(--atr-text)]">
        {section.title}
      </h2>
      <div className="grid gap-[0.35rem] p-[0.75rem]">
        {section.items.map((item) => (
          <div
            key={`${section.id}-${item.label}-${item.value ?? ''}`}
            className="grid min-h-[2rem] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-[0.45rem] rounded-[0.3rem] bg-[rgba(232,169,186,0.12)] px-[0.6rem] py-[0.38rem]"
          >
            <span className="min-w-0 text-[0.82rem] font-medium text-[var(--atr-text)]">
              {item.label}
            </span>
            <span className="min-w-0 text-[0.78rem] leading-[1.35] text-[var(--atr-muted)]">
              {item.value ?? '가능'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RulesTable({ rules, ownedRules }: { rules: TendencyRule[]; ownedRules: TendencyRule[] }) {
  return (
    <section className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70">
      <h2 className="border-b border-[var(--atr-line)] px-[0.85rem] py-[0.55rem] text-[0.88rem] font-bold text-[var(--atr-text)]">
        주력 룰
      </h2>
      <div className="grid gap-[0.55rem] p-[0.75rem] md:hidden">
        {rules.map((rule) => (
          <article
            key={rule.name}
            className="rounded-[0.4rem] border border-[var(--atr-line)] bg-[#fff8fa] p-[0.65rem]"
          >
            <h3 className="break-words text-[0.9rem] font-bold text-[var(--atr-text)]">
              {rule.name}
            </h3>
            <dl className="mt-[0.45rem] grid gap-[0.35rem] text-[0.8rem] leading-[1.45]">
              <div className="grid grid-cols-[4.2rem_minmax(0,1fr)] gap-[0.5rem]">
                <dt className="text-[var(--atr-soft)]">역할</dt>
                <dd className="min-w-0 break-words text-[var(--atr-muted)]">{rule.role || '-'}</dd>
              </div>
              <div className="grid grid-cols-[4.2rem_minmax(0,1fr)] gap-[0.5rem]">
                <dt className="text-[var(--atr-soft)]">숙련도</dt>
                <dd className="min-w-0 break-words text-[var(--atr-muted)]">{rule.fluency || '-'}</dd>
              </div>
              <div className="grid grid-cols-[4.2rem_minmax(0,1fr)] gap-[0.5rem]">
                <dt className="text-[var(--atr-soft)]">기타</dt>
                <dd className="min-w-0 break-words text-[var(--atr-muted)]">{rule.note || '-'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden md:block">
        <table className="w-full min-w-[26rem] border-collapse">
          <thead>
            <tr className="bg-[#fff0f4] text-left text-[0.74rem] text-[var(--atr-soft)]">
              <th className="px-[0.75rem] py-[0.5rem]">룰</th>
              <th className="px-[0.75rem] py-[0.5rem]">역할</th>
              <th className="px-[0.75rem] py-[0.5rem]">숙련도</th>
              <th className="px-[0.75rem] py-[0.5rem]">기타</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.name} className="border-t border-[var(--atr-line)] text-[0.84rem]">
                <td className="px-[0.75rem] py-[0.55rem] font-bold text-[var(--atr-text)]">
                  {rule.name}
                </td>
                <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.role || '-'}</td>
                <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.fluency || '-'}</td>
                <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OwnedRulesDisclosure rules={ownedRules} />
    </section>
  );
}

function OwnedRulesDisclosure({ rules }: { rules: TendencyRule[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleLabel = isOpen ? '보유 룰북 접기' : '보유 룰북';

  return (
    <section className="overflow-hidden border-t border-[var(--atr-line)]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex min-h-[1.35rem] w-full items-center justify-center bg-[#fff0f4] px-[0.85rem] py-[0.1rem] text-center text-[0.68rem] font-bold text-[var(--atr-text)] transition-colors hover:bg-[rgba(232,169,186,0.24)]"
      >
        <span>{toggleLabel}</span>
        <span aria-hidden="true" className="absolute right-[0.85rem] text-[0.75rem] text-[var(--atr-accent)]">{isOpen ? '−' : '+'}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--atr-line)]"
          >
            {rules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[26rem] border-collapse">
                  <thead>
                    <tr className="bg-[#fff0f4] text-left text-[0.74rem] text-[var(--atr-soft)]">
                      <th className="px-[0.75rem] py-[0.5rem]">룰</th><th className="px-[0.75rem] py-[0.5rem]">역할</th><th className="px-[0.75rem] py-[0.5rem]">숙련도</th><th className="px-[0.75rem] py-[0.5rem]">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.name} className="border-t border-[var(--atr-line)] text-[0.84rem]">
                        <td className="px-[0.75rem] py-[0.55rem] font-bold text-[var(--atr-text)]">{rule.name}</td>
                        <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.role || '-'}</td>
                        <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.fluency || '-'}</td>
                        <td className="px-[0.75rem] py-[0.55rem] text-[var(--atr-muted)]">{rule.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-[0.85rem] py-[0.75rem] text-[0.82rem] text-[var(--atr-muted)]">등록된 보유 룰북이 없습니다.</p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Boundaries({ dislikes, ratings }: { dislikes: string[]; ratings: TendencyRating[] }) {
  return (
    <section className="grid gap-[0.85rem] md:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70">
        <h2 className="border-b border-[var(--atr-line)] px-[0.85rem] py-[0.55rem] text-[0.88rem] font-bold text-[var(--atr-text)]">
          불호 요소
        </h2>
        <div className="flex flex-wrap gap-[0.4rem] p-[0.75rem]">
          {dislikes.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[rgba(200,121,147,0.32)] bg-[rgba(232,169,186,0.14)] px-[0.65rem] py-[0.24rem] text-[0.8rem] text-[var(--atr-muted)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70">
        <h2 className="border-b border-[var(--atr-line)] px-[0.85rem] py-[0.55rem] text-[0.88rem] font-bold text-[var(--atr-text)]">
          방송통신위원회 기준
        </h2>
        <div className="grid gap-[0.45rem] p-[0.75rem] sm:grid-cols-2">
          {ratings.map((rating) => (
            <div key={rating.label} className="rounded-[0.35rem] bg-[#fff8fa] p-[0.65rem]">
              <div className="flex items-center justify-between gap-[0.6rem]">
                <span className="text-[0.84rem] font-bold text-[var(--atr-text)]">{rating.label}</span>
                <span className="rounded-full bg-[var(--atr-accent)] px-[0.45rem] py-[0.1rem] text-[0.72rem] font-bold text-white">
                  {rating.level}
                </span>
              </div>
              <p className="mt-[0.35rem] text-[0.76rem] leading-[1.45] text-[var(--atr-muted)]">
                {rating.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailCompareTable({ entries }: { entries: TendencyDetailEntry[] }) {
  return (
    <div className="overflow-hidden rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70">
      <div className="hidden grid-cols-[0.72fr_1fr_1fr] border-b border-[var(--atr-line)] bg-[#fff0f4] text-[0.76rem] font-bold text-[var(--atr-soft)] md:grid">
        <span className="px-[0.75rem] py-[0.55rem]">항목</span>
        <span className="px-[0.75rem] py-[0.55rem]">GM 성향</span>
        <span className="px-[0.75rem] py-[0.55rem]">PL 성향</span>
      </div>
      <div className="divide-y divide-[var(--atr-line)]">
        {entries.map((entry) => (
          <div key={`${entry.category}-${entry.label}`} className="grid gap-[0.45rem] p-[0.75rem] md:grid-cols-[0.72fr_1fr_1fr] md:gap-0">
            <div className="text-[0.86rem] font-bold text-[var(--atr-text)]">{entry.label}</div>
            <div className="rounded-[0.35rem] bg-[rgba(232,169,186,0.11)] p-[0.55rem] text-[0.82rem] leading-[1.55] text-[var(--atr-muted)] md:rounded-none md:bg-transparent md:px-[0.75rem] md:py-0">
              <span className="mr-[0.35rem] font-bold text-[var(--atr-accent)] md:hidden">GM</span>
              {entry.gm}
            </div>
            <div className="rounded-[0.35rem] bg-[rgba(88,125,163,0.08)] p-[0.55rem] text-[0.82rem] leading-[1.55] text-[var(--atr-muted)] md:rounded-none md:bg-transparent md:px-[0.75rem] md:py-0">
              <span className="mr-[0.35rem] font-bold text-[var(--atr-accent)] md:hidden">PL</span>
              {entry.pl}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function triggerLabel(status: TendencyTriggerItem['status']) {
  if (status === 'ok') return 'O 상관 없음';
  if (status === 'depict') return '△ 단순 묘사';
  if (status === 'ask') return '! 사전 조율';
  return 'X 거절';
}

function triggerClass(status: TendencyTriggerItem['status']) {
  if (status === 'ok') return 'border-[rgba(117,150,128,0.34)] bg-[rgba(117,150,128,0.12)]';
  if (status === 'depict') return 'border-[rgba(201,158,86,0.42)] bg-[rgba(201,158,86,0.12)]';
  if (status === 'ask') return 'border-[rgba(200,121,147,0.5)] bg-[rgba(232,169,186,0.18)]';
  return 'border-[rgba(128,96,107,0.24)] bg-[rgba(128,96,107,0.08)]';
}

function DetailTendency({
  profile,
  activeTab,
  onTabChange,
}: {
  profile: TendencyProfile;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  const tabEntries = profile.details.filter((entry) => entry.category === activeTab);

  return (
    <section className="rounded-[0.55rem] border border-[var(--atr-line)] bg-white/55">
      <div className="border-b border-[var(--atr-line)] p-[0.85rem]">
        <div>
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--atr-soft)]">Detailed tendency</p>
            <h2 className="mt-[0.12rem] text-[1.1rem] font-bold text-[var(--atr-text)]">상세 성향</h2>
          </div>
        </div>

        <div className="mt-[0.75rem] grid grid-cols-4 gap-[0.35rem]">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[2rem] rounded-[0.35rem] border px-[0.4rem] text-[0.8rem] font-bold transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--atr-line-strong)] bg-[rgba(232,169,186,0.22)] text-[var(--atr-accent)]'
                  : 'border-[var(--atr-line)] bg-white/60 text-[var(--atr-muted)] hover:text-[var(--atr-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-[0.85rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'safety' ? (
              <div className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70 p-[0.75rem]">
                <h3 className="mb-[0.55rem] text-[0.9rem] font-bold text-[var(--atr-text)]">트리거 / 조율 기준</h3>
                <div className="grid gap-[0.4rem] sm:grid-cols-2 lg:grid-cols-3">
                  {profile.triggers.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-[0.35rem] border px-[0.58rem] py-[0.45rem] ${triggerClass(item.status)}`}
                    >
                      <div className="flex items-center justify-between gap-[0.45rem]">
                        <span className="text-[0.8rem] font-bold text-[var(--atr-text)]">{item.label}</span>
                        <span className="shrink-0 text-[0.68rem] text-[var(--atr-muted)]">{triggerLabel(item.status)}</span>
                      </div>
                      {item.note ? (
                        <p className="mt-[0.25rem] text-[0.7rem] text-[var(--atr-soft)]">{item.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <DetailCompareTable entries={tabEntries} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function TendencyEditor({
  profile,
  onClose,
}: {
  profile: TendencyProfile;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TendencyProfileInput>({
    displayName: profile.displayName,
    handle: normalizeTwitterHandle(profile.handle),
    profileUrl: buildTwitterProfileUrl(profile.handle),
    avatarUrl: buildTwitterAvatarUrl(profile.handle),
    statusLine: profile.statusLine,
    detailTags: profile.detailTags,
    sections: profile.sections,
    rules: profile.rules,
    ownedRules: profile.ownedRules ?? DEFAULT_TENDENCY_PROFILE.ownedRules,
    dislikes: profile.dislikes,
    ratings: profile.ratings,
    details: profile.details,
    characterTraits: profile.characterTraits ?? DEFAULT_TENDENCY_PROFILE.characterTraits,
    preferences: profile.preferences,
    triggers: profile.triggers,
  });
  const [sectionText, setSectionText] = useState(
    profile.sections.map((section) => stringifyItems(section.items)),
  );
  const [rulesText, setRulesText] = useState(stringifyRules(profile.rules));
  const [ownedRulesText, setOwnedRulesText] = useState(stringifyRules(profile.ownedRules ?? []));
  const [dislikesText, setDislikesText] = useState(profile.dislikes.join('\n'));
  const [ratingsText, setRatingsText] = useState(stringifyRatings(profile.ratings));
  const [tagsText, setTagsText] = useState(profile.detailTags.join('\n'));
  const [detailsText, setDetailsText] = useState(stringifyDetails(profile.details));
  const [triggersText, setTriggersText] = useState(stringifyTriggers(profile.triggers));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nextSections = draft.sections.map((section, index) => ({
        ...section,
        items: parseItems(sectionText[index] ?? ''),
      }));
      const handle = normalizeTwitterHandle(draft.handle);
      await updateTendencyProfile({
        ...draft,
        handle,
        profileUrl: buildTwitterProfileUrl(handle),
        avatarUrl: buildTwitterAvatarUrl(handle),
        detailTags: tagsText.split('\n').map((line) => line.trim()).filter(Boolean),
        sections: nextSections,
        rules: parseRules(rulesText),
        ownedRules: parseRules(ownedRulesText),
        dislikes: dislikesText.split('\n').map((line) => line.trim()).filter(Boolean),
        ratings: parseRatings(ratingsText),
        details: parseDetails(detailsText),
        triggers: parseTriggers(triggersText),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function updateSectionTitle(index: number, title: string) {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => (i === index ? { ...section, title } : section)),
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(76,51,61,0.28)] p-[1rem] backdrop-blur-[0.25rem]"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-[48rem] overflow-hidden rounded-[0.65rem] border border-[var(--atr-line)] bg-[#fff8fa]"
      >
        <form onSubmit={handleSubmit} className="max-h-[88vh] overflow-y-auto">
          <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-[var(--atr-line)] bg-[#fff8fa] px-[1rem] py-[0.8rem]">
            <h2 className="text-[1.05rem] font-bold text-[var(--atr-text)]">성향표 편집</h2>
            <div className="flex gap-[0.45rem]">
              <button type="button" onClick={onClose} className="px-[0.7rem] py-[0.35rem] text-[0.82rem] text-[var(--atr-muted)]">
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-[0.35rem] border border-[var(--atr-line-strong)] bg-[rgba(232,169,186,0.22)] px-[0.8rem] py-[0.35rem] text-[0.82rem] font-bold text-[var(--atr-accent)] disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          <div className="grid gap-[1rem] p-[1rem]">
            <div className="grid gap-[0.65rem] md:grid-cols-2">
              {(['displayName', 'handle'] as const).map((key) => (
                <label key={key} className="grid gap-[0.28rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
                  {key === 'displayName' ? '닉네임' : 'X 아이디'}
                  <input
                    value={draft[key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.45rem] text-[0.86rem] font-normal text-[var(--atr-text)] outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="grid gap-[0.28rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              상태 문구
              <input
                value={draft.statusLine}
                onChange={(e) => setDraft((prev) => ({ ...prev, statusLine: e.target.value }))}
                className="rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.45rem] text-[0.86rem] font-normal text-[var(--atr-text)] outline-none"
              />
            </label>

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              상세 태그
              <textarea
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                rows={3}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
            </label>

            {draft.sections.map((section, index) => (
              <div key={section.id} className="grid gap-[0.45rem] rounded-[0.45rem] border border-[var(--atr-line)] p-[0.75rem]">
                <input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(index, e.target.value)}
                  className="rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.42rem] text-[0.86rem] font-bold text-[var(--atr-text)] outline-none"
                />
                <textarea
                  value={sectionText[index]}
                  onChange={(e) => {
                    const next = [...sectionText];
                    next[index] = e.target.value;
                    setSectionText(next);
                  }}
                  rows={6}
                  className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] leading-[1.5] text-[var(--atr-text)] outline-none"
                />
                <p className="text-[0.72rem] text-[var(--atr-soft)]">형식: 항목 또는 항목 | 설명</p>
              </div>
            ))}

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              주력 룰
              <textarea
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                rows={5}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
              <span className="mt-[0.3rem]">보유 룰북</span>
              <textarea
                value={ownedRulesText}
                onChange={(e) => setOwnedRulesText(e.target.value)}
                rows={5}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
              <span className="font-normal">형식: 룰 | 역할 | 숙련도 | 기타</span>
            </label>

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              불호 요소
              <textarea
                value={dislikesText}
                onChange={(e) => setDislikesText(e.target.value)}
                rows={3}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
            </label>

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              등급 기준
              <textarea
                value={ratingsText}
                onChange={(e) => setRatingsText(e.target.value)}
                rows={4}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
              <span className="font-normal">형식: 항목 | 단계 | 설명</span>
            </label>

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              상세 비교
              <textarea
                value={detailsText}
                onChange={(e) => setDetailsText(e.target.value)}
                rows={8}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
              <span className="font-normal">형식: prepare|session|roleplay | 항목 | GM 성향 | PL 성향</span>
            </label>

            <label className="grid gap-[0.35rem] text-[0.78rem] font-bold text-[var(--atr-soft)]">
              트리거 / 조율 기준
              <textarea
                value={triggersText}
                onChange={(e) => setTriggersText(e.target.value)}
                rows={7}
                className="resize-y rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.5rem] text-[0.82rem] font-normal leading-[1.5] text-[var(--atr-text)] outline-none"
              />
              <span className="font-normal">형식: 항목 | ok/depict/ask/no | 메모</span>
            </label>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TendencySection() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<TendencyProfile>(DEFAULT_TENDENCY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('prepare');

  useEffect(() => {
    const unsubscribe = subscribeToTendencyProfile((nextProfile) => {
      setProfile(nextProfile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const primarySections = useMemo(() => profile.sections.slice(0, 5), [profile.sections]);

  return (
    <main className="afterroll-desk min-h-screen px-[1rem] pb-[3rem] pt-[1rem] text-[var(--atr-text)] md:px-[1.35rem]">
      <div className="mx-auto max-w-[78rem]">
        <header className="mb-[1rem] flex flex-wrap items-center justify-between gap-[0.75rem] border-b border-[var(--atr-line)] pb-[0.85rem]">
          <div>
            <p className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--atr-soft)]">TRPG Profile</p>
            <h1 className="mt-[0.18rem] text-[1.8rem] font-bold leading-none text-[var(--atr-text)] md:text-[2.35rem]">
              성향표
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[0.45rem]">
            {isAdmin && !authLoading && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-[0.35rem] border border-[var(--atr-line-strong)] bg-[rgba(232,169,186,0.18)] px-[0.8rem] py-[0.38rem] text-[0.82rem] font-bold text-[var(--atr-accent)]"
              >
                성향표 편집
              </button>
            )}
            <AdminLoginButton />
          </div>
        </header>

        {loading ? (
          <div className="rounded-[0.45rem] border border-[var(--atr-line)] bg-white/70 p-[2rem] text-center text-[0.9rem] text-[var(--atr-muted)]">
            불러오는 중...
          </div>
        ) : (
          <div className="grid gap-[1rem] lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="ledger-paper-sheet relative self-stretch rounded-[0.6rem] p-[0.85rem]">
              <div className="tendency-profile-sticky lg:sticky lg:top-0">
                <ProfileStamp profile={profile} />
              </div>
            </aside>

            <div className="grid gap-[0.85rem]">
              <div className="grid gap-[0.85rem] md:grid-cols-2 xl:grid-cols-3">
                {primarySections.map((section) => (
                  <InfoSection key={section.id} section={section} />
                ))}
              </div>
              <RulesTable rules={profile.rules} ownedRules={profile.ownedRules ?? []} />
              <Boundaries dislikes={profile.dislikes} ratings={profile.ratings} />
              <DetailTendency
                profile={profile}
                activeTab={activeDetailTab}
                onTabChange={setActiveDetailTab}
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && <TendencyEditor profile={profile} onClose={() => setEditing(false)} />}
      </AnimatePresence>
    </main>
  );
}
