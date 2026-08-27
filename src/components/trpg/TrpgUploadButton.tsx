'use client';

import { ChangeEvent, type ReactNode, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { buildTrpgUploadFiles, commitTrpgUpload, type TrpgUploadDraft } from '@/lib/trpgUpload';

const TOKEN_STORAGE_KEY = 'after-the-roll-github-token';
const FORMAT_OPTIONS = [
  { value: 'roll20', label: 'Roll20' },
  { value: 'ccfolia', label: 'CCFOLIA' },
  { value: 'cca', label: 'CCA' },
] as const;

function dateToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()).replaceAll('-', '.');
}

function tagsFromInput(value: string) {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean)));
}

export default function TrpgUploadButton() {
  const { isAdmin, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [source, setSource] = useState<{ name: string; html: string } | null>(null);
  const [title, setTitle] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dateToday);
  const [tags, setTags] = useState('');
  const [format, setFormat] = useState<TrpgUploadDraft['format']>('roll20');
  const [mainChannels, setMainChannels] = useState('main');
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !isAdmin) return null;

  const readSource = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const html = await file.text();
    setSource({ name: file.name, html });
    if (!title) setTitle(file.name.replace(/\.(source\.)?html?$/i, ''));
  };

  const submit = async () => {
    if (!source || !title.trim() || !scenarioTitle.trim() || !date.match(/^\d{4}\.\d{2}\.\d{2}$/)) {
      setStatus('원본 HTML, 로그 제목, 시나리오명, 날짜를 확인해 주세요.');
      return;
    }
    const accessToken = token.trim() || window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!accessToken) {
      setStatus('GitHub fine-grained access token을 입력해 주세요.');
      return;
    }

    const draft: TrpgUploadDraft = {
      title: title.trim(), scenarioTitle: scenarioTitle.trim(), description: description.trim(), date,
      tags: tagsFromInput(tags), format, locked, mainChannels: tagsFromInput(mainChannels),
      sourceFileName: source.name, sourceHtml: source.html,
    };
    setSubmitting(true);
    setStatus('로그 파일과 메타데이터를 저장하는 중…');
    try {
      if (token.trim()) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
      const folder = await commitTrpgUpload(accessToken, draft);
      setStatus(`${folder}에 저장했습니다. 저장소 동기화 배포 후 로그 목록에 표시됩니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewPath = source && title && scenarioTitle && date.match(/^\d{4}/)
    ? buildTrpgUploadFiles({ title, scenarioTitle, description, date, tags: tagsFromInput(tags), format, locked, mainChannels: tagsFromInput(mainChannels), sourceFileName: source.name, sourceHtml: source.html }).folderPath
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
              <button type="button" onClick={() => setOpen(false)} className="afterroll-meta text-[0.78rem] text-[var(--ledger-muted)]">닫기</button>
            </div>
            <div className="grid gap-[0.8rem] md:grid-cols-2">
              <Field label="로그 원본 HTML"><input ref={fileInputRef} type="file" accept=".html,.htm,text/html" onChange={readSource} className="w-full text-[0.78rem]" /></Field>
              <Field label="형식"><select value={format} onChange={(event) => setFormat(event.target.value as TrpgUploadDraft['format'])}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <Field label="로그 제목"><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
              <Field label="시나리오명"><input value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} /></Field>
              <Field label="날짜 (YYYY.MM.DD)"><input value={date} onChange={(event) => setDate(event.target.value)} placeholder="2026.08.28" /></Field>
              <Field label="태그 (쉼표로 구분)"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="시노비가미, PL, 4인" /></Field>
              <Field label="메인 채널 (쉼표로 구분)"><input value={mainChannels} onChange={(event) => setMainChannels(event.target.value)} placeholder="main" /></Field>
              <Field label="공개 설정"><label className="flex items-center gap-[0.5rem] text-[0.9rem]"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} /> 비공개 로그</label></Field>
            </div>
            <Field label="설명"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></Field>
            <div className="mt-[0.8rem] border-t border-[var(--atr-line)] pt-[0.8rem]"><Field label="GitHub access token"><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="fine-grained token (Contents: Read and write)" autoComplete="off" /><p className="mt-[0.3rem] text-[0.72rem] text-[var(--ledger-soft)]">토큰은 이 브라우저 탭이 닫히면 사라집니다. `flosnidor9/Trpg-Logs`의 Contents 읽기·쓰기 권한만 부여하세요.</p></Field></div>
            {previewPath ? <p className="afterroll-meta mt-[0.8rem] text-[0.72rem] text-[var(--ledger-soft)]">저장 위치: {previewPath}</p> : null}
            {status ? <p className="mt-[0.8rem] text-[0.86rem] text-[var(--ledger-muted)]" role="status">{status}</p> : null}
            <div className="mt-[1rem] flex justify-end gap-[0.6rem]"><button type="button" onClick={() => setOpen(false)} className="ledger-index-tab afterroll-meta px-[0.8rem] py-[0.45rem] text-[0.78rem]">취소</button><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={submit} disabled={submitting} className="ledger-stamp afterroll-meta px-[0.9rem] py-[0.45rem] text-[0.78rem] disabled:opacity-50">{submitting ? '저장 중…' : '저장소에 올리기'}</motion.button></div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mt-[0.8rem]"><span className="afterroll-meta mb-[0.32rem] block text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ledger-soft)]">{label}</span><div className="[&_input]:w-full [&_input]:border [&_input]:border-[var(--atr-line)] [&_input]:bg-white/45 [&_input]:px-[0.6rem] [&_input]:py-[0.42rem] [&_input]:text-[0.9rem] [&_select]:w-full [&_select]:border [&_select]:border-[var(--atr-line)] [&_select]:bg-white/45 [&_select]:px-[0.6rem] [&_select]:py-[0.42rem] [&_select]:text-[0.9rem] [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--atr-line)] [&_textarea]:bg-white/45 [&_textarea]:px-[0.6rem] [&_textarea]:py-[0.42rem] [&_textarea]:text-[0.9rem]">{children}</div></div>;
}
