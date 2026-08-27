'use client';

import { ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { buildTrpgUploadFiles, commitTrpgUpload, encryptTrpgLogContent, saveTrpgPassword, type TrpgUploadDraft } from '@/lib/trpgUpload';
import { expandCcaArchive, isCompressedCcaArchive } from '@/lib/ccaArchive';

const TOKEN_STORAGE_KEY = 'after-the-roll-github-token';
const MASTER_KEY_STORAGE_KEY = 'after-the-roll-master-key';
const FORMAT_OPTIONS = [
  { value: 'roll20', label: 'Roll20' },
  { value: 'ccfolia', label: 'CCFOLIA' },
  { value: 'cca', label: 'CCA' },
] as const;

type CastSelection = {
  plName: string;
  pcName: string;
  imageIndex: number | null;
};

function dateToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()).replaceAll('-', '.');
}

function tagsFromInput(value: string) {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean)));
}

function detectUploadFormat(html: string): TrpgUploadDraft['format'] {
  if ((/class=["'][^"']*icecandy-export/.test(html) && /data-skin=["']roll20/.test(html)) || /class=["'][^"']*\bmessage\b/.test(html)) {
    return 'roll20';
  }
  if (isCompressedCcaArchive(html) || /class=["'][^"']*\bcca-wrap\b/.test(html) || /article\.row|dice-result-card/.test(html)) return 'cca';
  return 'ccfolia';
}

function uniqueNames(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() ?? '').filter(Boolean)));
}

function extractSpeakers(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const icecandySpeakers = Array.from(document.querySelectorAll('[data-entry-id] [class~="float-left"] > span.text-foreground'))
    .map((element) => element.textContent);
  const roll20Speakers = Array.from(document.querySelectorAll('.message .by'))
    .map((element) => element.textContent?.replace(/:\s*$/, ''));
  const ccfoliaSpeakers = Array.from(document.querySelectorAll('body > p[style]'))
    .map((element) => element.querySelectorAll('span')[1]?.textContent);
  const ccaSpeakers = Array.from(document.querySelectorAll('article.row:not(.narrator)'))
    .map((element) => element.querySelector('.copy header b, .dice-result-card b')?.textContent);
  const compressedCcaSpeakers = Array.from(document.querySelectorAll('div.r.row .c > header > b'))
    .map((element) => element.textContent);

  return uniqueNames([...icecandySpeakers, ...roll20Speakers, ...ccfoliaSpeakers, ...ccaSpeakers, ...compressedCcaSpeakers]);
}

function extractImageSources(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const imageElements = Array.from(document.querySelectorAll('img[src]')).map((element) => element.getAttribute('src'));
  const backgroundImages = Array.from(html.matchAll(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi)).map((match) => match[1]);
  return Array.from(new Set([...imageElements, ...backgroundImages].filter((source): source is string => Boolean(source))));
}

function toggleCastSelection(current: CastSelection[], pcName: string, selected: boolean) {
  if (!selected) return current.filter((entry) => entry.pcName !== pcName);
  return [...current, { plName: '', pcName, imageIndex: null }];
}

export default function TrpgUploadButton() {
  const { isAdmin, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [rememberToken, setRememberToken] = useState(true);
  const [source, setSource] = useState<{ name: string; html: string } | null>(null);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [imageSources, setImageSources] = useState<string[]>([]);
  const [castSelections, setCastSelections] = useState<CastSelection[]>([]);
  const [hoveredImageSource, setHoveredImageSource] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dateToday);
  const [tags, setTags] = useState('');
  const [format, setFormat] = useState<TrpgUploadDraft['format']>('roll20');
  const [mainChannels, setMainChannels] = useState('main');
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedMasterKey = window.localStorage.getItem(MASTER_KEY_STORAGE_KEY);
    if (savedToken) setToken(savedToken);
    if (savedMasterKey) setMasterKey(savedMasterKey);
  }, []);

  if (loading || !isAdmin) return null;

  const readSource = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const html = await file.text();
    const previewHtml = await expandCcaArchive(html);
    setSource({ name: file.name, html });
    setFormat(detectUploadFormat(html));
    setSpeakers(extractSpeakers(previewHtml));
    setImageSources(extractImageSources(previewHtml));
    setCastSelections([]);
    setHoveredImageSource(null);
    if (!title) setTitle(file.name.replace(/\.(source\.)?html?$/i, ''));
  };

  const closeDialog = () => {
    setMasterKey(window.localStorage.getItem(MASTER_KEY_STORAGE_KEY) ?? '');
    setPassword('');
    setPasswordConfirm('');
    setOpen(false);
  };

  const submit = async () => {
    if (!source || !title.trim() || !scenarioTitle.trim() || !date.match(/^\d{4}\.\d{2}\.\d{2}$/)) {
      setStatus('원본 HTML, 로그 제목, 시나리오명, 날짜를 확인해 주세요.');
      return;
    }
    if (locked && (!password || password !== passwordConfirm || !masterKey)) {
      setStatus('비공개 로그의 비밀번호, 비밀번호 확인, 마스터키를 확인해 주세요.');
      return;
    }
    const accessToken = token.trim() || window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!accessToken) {
      setStatus('GitHub fine-grained access token을 입력해 주세요.');
      return;
    }

    const draft: TrpgUploadDraft = {
      title: title.trim(), scenarioTitle: scenarioTitle.trim(), description: description.trim(), date,
      tags: tagsFromInput(tags), format, locked, mainChannels: tagsFromInput(mainChannels),
      sourceFileName: source.name, sourceHtml: locked ? await encryptTrpgLogContent(source.html, password) : source.html,
      cast: castSelections.map(({ plName, pcName, imageIndex }) => ({
        plName,
        pcName,
        iconSrc: imageIndex === null ? '' : imageSources[imageIndex] ?? '',
      })),
    };
    setSubmitting(true);
    setStatus('로그 파일과 메타데이터를 저장하는 중…');
    try {
      if (rememberToken) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        if (locked) window.localStorage.setItem(MASTER_KEY_STORAGE_KEY, masterKey);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
      }
      if (locked) {
        setStatus('비밀번호 목록을 안전하게 갱신하는 중…');
        const { postSlug } = buildTrpgUploadFiles(draft);
        await saveTrpgPassword(accessToken, masterKey, postSlug, password);
      }
      const folder = await commitTrpgUpload(accessToken, draft);
      setStatus(`${folder}에 저장했습니다. 저장소 동기화 배포 후 로그 목록에 표시됩니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewPath = source && title && scenarioTitle && date.match(/^\d{4}/)
    ? buildTrpgUploadFiles({ title, scenarioTitle, description, date, tags: tagsFromInput(tags), format, locked, mainChannels: tagsFromInput(mainChannels), sourceFileName: source.name, sourceHtml: source.html, cast: castSelections.map(({ plName, pcName, imageIndex }) => ({ plName, pcName, iconSrc: imageIndex === null ? '' : imageSources[imageIndex] ?? '' })) }).folderPath
    : null;

  return (
    <>
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setOpen(true)} className="ledger-stamp afterroll-meta rounded-[0.16rem] px-[0.78rem] py-[0.42rem] text-[0.78rem] uppercase tracking-[0.08em]">
        로그 올리기
      </motion.button>
      {open ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(32,28,25,0.52)] p-[1rem]" role="dialog" aria-modal="true" aria-label="TRPG 로그 올리기">
          <motion.div initial={{ opacity: 0, y: '1rem' }} animate={{ opacity: 1, y: 0 }} className="ledger-paper-sheet mx-auto my-[2rem] max-w-[44rem] p-[1rem] md:p-[1.4rem]">
            <div className="mb-[1rem] flex items-start justify-between gap-[1rem] border-b border-[var(--atr-line)] pb-[0.8rem]">
              <div><p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.14em] text-[var(--atr-accent)]">Archive intake</p><h2 className="afterroll-title mt-[0.2rem] text-[2rem]">로그 올리기</h2></div>
              <button type="button" onClick={closeDialog} className="afterroll-meta text-[0.78rem] text-[var(--ledger-muted)]">닫기</button>
            </div>
            <div className="grid gap-[0.8rem] md:grid-cols-2">
              <Field label="로그 원본 HTML">
                <div className="flex items-center gap-[0.6rem]">
                  <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" onChange={readSource} className="sr-only" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="ledger-index-tab shrink-0 rounded-[0.16rem] px-[0.65rem] py-[0.42rem] text-[0.78rem]">HTML 불러오기</button>
                  <span className="min-w-0 truncate text-[0.78rem] text-[var(--ledger-soft)]">{source?.name ?? '선택된 파일 없음'}</span>
                </div>
              </Field>
              <Field label="형식"><select value={format} onChange={(event) => setFormat(event.target.value as TrpgUploadDraft['format'])}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <Field label="로그 제목"><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
              <Field label="시나리오명"><input value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} /></Field>
              <Field label="날짜 (YYYY.MM.DD)"><input value={date} onChange={(event) => setDate(event.target.value)} placeholder="2026.08.28" /></Field>
              <Field label="태그 (쉼표로 구분)"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="시노비가미, PL, 4인" /></Field>
              <Field label="메인 채널 (쉼표로 구분)"><input value={mainChannels} onChange={(event) => setMainChannels(event.target.value)} placeholder="main" /></Field>
              <Field label="공개 설정"><label className="flex items-center gap-[0.5rem] text-[0.9rem]"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} className="!h-[0.95rem] !w-[0.95rem] shrink-0" /> 비공개 로그</label></Field>
            </div>
            {speakers.length > 0 ? (
              <Field label="발화자 미리보기 — CAST 연결">
                <p className="mb-[0.5rem] text-[0.78rem] text-[var(--ledger-soft)]">PC를 선택한 뒤 PL 이름과 HTML 안의 아이콘을 연결하세요. 선택한 항목만 MD에 기록됩니다.</p>
                <div className="grid gap-[0.55rem]">
                  {speakers.map((speaker) => {
                    const selection = castSelections.find((entry) => entry.pcName === speaker);
                    return (
                      <div key={speaker} className="rounded-[0.16rem] border border-[var(--atr-line)] p-[0.55rem]">
                        <label className="flex items-center gap-[0.5rem] text-[0.86rem] text-[var(--ledger-muted)]">
                          <input
                            type="checkbox"
                            checked={Boolean(selection)}
                            onChange={(event) => setCastSelections((current) => toggleCastSelection(current, speaker, event.target.checked))}
                            className="!h-[0.95rem] !w-[0.95rem] shrink-0"
                          />
                          <span>PC · {speaker}</span>
                        </label>
                        {selection ? (
                          <div className="mt-[0.55rem] grid gap-[0.45rem]">
                            <input
                              value={selection.plName}
                              onChange={(event) => setCastSelections((current) => current.map((entry) => entry.pcName === speaker ? { ...entry, plName: event.target.value } : entry))}
                              placeholder="PL 이름"
                              aria-label={`${speaker} PL 이름`}
                            />
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-[0.35rem]">
                              <button
                                type="button"
                                onClick={() => setCastSelections((current) => current.map((entry) => entry.pcName === speaker ? { ...entry, imageIndex: null } : entry))}
                                className={`flex aspect-square items-center justify-center rounded-[0.14rem] border text-[0.62rem] ${selection.imageIndex === null ? 'border-[var(--atr-accent)] bg-[rgba(88,125,163,0.1)] text-[var(--atr-accent)]' : 'border-[var(--atr-line)] text-[var(--ledger-soft)]'}`}
                                aria-label={`${speaker} 아이콘 선택 해제`}
                              >
                                NONE
                              </button>
                              {imageSources.map((source, imageIndex) => (
                                <button
                                  key={imageIndex}
                                  type="button"
                                  onClick={() => setCastSelections((current) => current.map((entry) => entry.pcName === speaker ? { ...entry, imageIndex } : entry))}
                                  className={`aspect-square rounded-[0.14rem] border bg-cover bg-top bg-no-repeat ${selection.imageIndex === imageIndex ? 'border-[var(--atr-accent)] ring-1 ring-[var(--atr-accent)]' : 'border-[var(--atr-line)]'}`}
                                  style={{ backgroundImage: `url("${source}")` }}
                                  aria-label={`${speaker} 아이콘으로 HTML 이미지 ${imageIndex + 1} 선택`}
                                  onMouseEnter={() => setHoveredImageSource(source)}
                                  onMouseLeave={() => setHoveredImageSource(null)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Field>
            ) : source ? (
              <p className="afterroll-meta mt-[0.8rem] text-[0.72rem] text-[var(--ledger-soft)]">발화자 후보를 찾지 못했습니다. 이 파일은 CAST 없이 저장됩니다.</p>
            ) : null}
            {locked ? <div className="grid gap-[0.8rem] md:grid-cols-2"><Field label="로그 비밀번호"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="열람용 비밀번호" /></Field><Field label="비밀번호 확인"><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" placeholder="한 번 더 입력" /></Field><Field label="마스터키"><input type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} autoComplete="off" placeholder="TRPG_MASTER_KEY" /></Field><p className="afterroll-meta md:col-span-2 text-[0.72rem] text-[var(--ledger-soft)]">기존 비밀번호 목록을 갱신해 나중에 비밀번호를 복구할 수 있게 합니다.</p></div> : null}
            <Field label="설명"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></Field>
            <div className="mt-[0.8rem] border-t border-[var(--atr-line)] pt-[0.8rem]"><Field label="GitHub access token"><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="fine-grained token (Contents: Read and write)" autoComplete="current-password" /><label className="mt-[0.5rem] flex items-center gap-[0.45rem] text-[0.8rem] text-[var(--ledger-muted)]"><input type="checkbox" checked={rememberToken} onChange={(event) => setRememberToken(event.target.checked)} className="!h-[0.95rem] !w-[0.95rem] shrink-0" /> 이 기기에 토큰과 마스터키 저장</label><p className="mt-[0.3rem] text-[0.72rem] text-[var(--ledger-soft)]">개인 기기에서만 사용하세요. 비공개 로그를 올릴 때는 `Trpg-Logs`와 `flosnidor9.github.io` 두 저장소의 Contents 읽기·쓰기 권한이 필요합니다.</p></Field></div>
            {previewPath ? <p className="afterroll-meta mt-[0.8rem] text-[0.72rem] text-[var(--ledger-soft)]">저장 위치: {previewPath}</p> : null}
            {status ? <p className="mt-[0.8rem] text-[0.86rem] text-[var(--ledger-muted)]" role="status">{status}</p> : null}
            {hoveredImageSource ? (
              <div className="pointer-events-none fixed bottom-[1rem] right-[1rem] z-[110] w-[min(20rem,60vw)] rounded-[0.3rem] border border-[var(--atr-line)] bg-[rgba(251,252,253,0.98)] p-[0.3rem] shadow-[0_0.7rem_2rem_rgba(32,28,25,0.28)]">
                <div role="img" aria-label="아이콘 확대 미리보기" className="aspect-square w-full rounded-[0.16rem] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${hoveredImageSource}")` }} />
              </div>
            ) : null}
            <div className="mt-[1rem] flex justify-end gap-[0.6rem]"><button type="button" onClick={closeDialog} className="ledger-index-tab afterroll-meta px-[0.8rem] py-[0.45rem] text-[0.78rem]">취소</button><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={submit} disabled={submitting} className="ledger-stamp afterroll-meta px-[0.9rem] py-[0.45rem] text-[0.78rem] disabled:opacity-50">{submitting ? '저장 중…' : '저장소에 올리기'}</motion.button></div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mt-[0.8rem]"><span className="afterroll-meta mb-[0.32rem] block text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ledger-soft)]">{label}</span><div className="[&_input]:w-full [&_input]:border [&_input]:border-[var(--atr-line)] [&_input]:bg-white/45 [&_input]:px-[0.6rem] [&_input]:py-[0.42rem] [&_input]:text-[0.9rem] [&_select]:w-full [&_select]:border [&_select]:border-[var(--atr-line)] [&_select]:bg-white/45 [&_select]:px-[0.6rem] [&_select]:py-[0.42rem] [&_select]:text-[0.9rem] [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--atr-line)] [&_textarea]:bg-white/45 [&_textarea]:px-[0.6rem] [&_textarea]:py-[0.42rem] [&_textarea]:text-[0.9rem]">{children}</div></div>;
}
