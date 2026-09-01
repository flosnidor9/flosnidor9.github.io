'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  buildDeploymentUploadFiles,
  commitDeploymentUploadAtomically,
  encryptTrpgLogContent,
  resolveDeploymentUploadTitle,
  saveTrpgPassword,
} from '@/lib/trpgUpload';
import { useAuth } from '@/contexts/AuthContext';

const FIELD_CLASS = 'mt-[0.3rem] w-full rounded-[0.3rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.45rem] text-[0.86rem] text-[var(--atr-text)]';

export default function DeploymentUploadButton() {
  const { isAdmin, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [publicContent, setPublicContent] = useState('');
  const [privateContent, setPrivateContent] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (submitting) return;
    setOpen(false);
  }

  async function submit() {
    if (!isAdmin) {
      setStatus('관리자 로그인 후에만 글을 등록할 수 있습니다.');
      return;
    }
    if (!title.trim() || !date.trim() || !publicContent.trim() || !token.trim()) {
      setStatus('제목, 날짜, 공개 본문, GitHub 토큰을 입력해 주세요.');
      return;
    }
    if (privateContent.trim() && (!password || password !== passwordConfirm || !masterKey)) {
      setStatus('보호 본문에는 비밀번호, 비밀번호 확인, 마스터키가 모두 필요합니다.');
      return;
    }

    setSubmitting(true);
    setStatus('게시글을 저장하는 중입니다.');
    try {
      const encryptedContent = privateContent.trim() ? await encryptTrpgLogContent(privateContent, password) : undefined;
      const draft = {
        title: title.trim(), date: date.trim(), description: description.trim(),
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), publicContent, encryptedContent,
      };
      const resolved = await resolveDeploymentUploadTitle(token, draft);
      const folder = await commitDeploymentUploadAtomically(token, resolved);
      if (encryptedContent) {
        const { passwordKey } = buildDeploymentUploadFiles(resolved);
        await saveTrpgPassword(token, masterKey, passwordKey, password);
      }
      setStatus(`${folder}에 저장했습니다. 저장소 동기화 후 배포 페이지에 표시됩니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !isAdmin) return null;

  return <>
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setOpen(true)} className="ledger-stamp rounded-[0.2rem] px-[0.78rem] py-[0.42rem] text-[0.78rem]">글 등록</motion.button>
    {open ? <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(76,51,61,0.38)] p-[1rem]" role="dialog" aria-modal="true" aria-label="배포 글 등록">
      <div className="ledger-paper-sheet mx-auto my-[2rem] max-w-[44rem] p-[1rem] md:p-[1.4rem]">
        <div className="flex items-start justify-between gap-[1rem] border-b border-[var(--atr-line)] pb-[0.8rem]"><div><p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.12em] text-[var(--atr-accent)]">Deployment intake</p><h2 className="afterroll-title mt-[0.2rem] text-[1.8rem]">배포 글 등록</h2></div><button type="button" onClick={close} className="text-[0.78rem] text-[var(--atr-muted)]">닫기</button></div>
        <div className="mt-[0.8rem] grid gap-[0.75rem] md:grid-cols-2">
          <label className="text-[0.78rem] text-[var(--atr-muted)]">제목<input value={title} onChange={(event) => setTitle(event.target.value)} className={FIELD_CLASS} /></label>
          <label className="text-[0.78rem] text-[var(--atr-muted)]">날짜<input value={date} onChange={(event) => setDate(event.target.value)} placeholder="2026.09.02" className={FIELD_CLASS} /></label>
        </div>
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">한 줄 설명<input value={description} onChange={(event) => setDescription(event.target.value)} className={FIELD_CLASS} /></label>
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">태그 (쉼표로 구분)<input value={tags} onChange={(event) => setTags(event.target.value)} className={FIELD_CLASS} /></label>
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">공개 본문 (Markdown)<textarea value={publicContent} onChange={(event) => setPublicContent(event.target.value)} rows={8} className={FIELD_CLASS} /></label>
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">보호 본문 (선택, Markdown)<textarea value={privateContent} onChange={(event) => setPrivateContent(event.target.value)} rows={6} className={FIELD_CLASS} /></label>
        {privateContent.trim() ? <div className="mt-[0.75rem] grid gap-[0.75rem] md:grid-cols-3"><label className="text-[0.78rem] text-[var(--atr-muted)]">글 비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={FIELD_CLASS} /></label><label className="text-[0.78rem] text-[var(--atr-muted)]">비밀번호 확인<input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} className={FIELD_CLASS} /></label><label className="text-[0.78rem] text-[var(--atr-muted)]">마스터키<input type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} className={FIELD_CLASS} /></label></div> : null}
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">GitHub access token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} className={FIELD_CLASS} /></label>
        {status ? <p className="mt-[0.8rem] whitespace-pre-wrap text-[0.82rem] text-[var(--atr-muted)]" role="status">{status}</p> : null}
        <div className="mt-[1rem] flex justify-end gap-[0.5rem]"><button type="button" onClick={close} className="ledger-index-tab rounded-[0.25rem] px-[0.75rem] py-[0.45rem] text-[0.78rem]">취소</button><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={submit} disabled={submitting} className="ledger-stamp rounded-[0.25rem] px-[0.8rem] py-[0.45rem] text-[0.78rem] disabled:opacity-50">{submitting ? '저장 중' : '저장소에 등록'}</motion.button></div>
      </div>
    </div> : null}
  </>;
}
