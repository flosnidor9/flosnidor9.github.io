'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DeploymentPost } from '@/lib/data/deployments';
import { commitDeploymentEditAtomically, deleteDeploymentAtomically, encryptTrpgLogContent, saveTrpgPassword } from '@/lib/trpgUpload';
import { useAuth } from '@/contexts/AuthContext';

const FIELD_CLASS = 'mt-[0.3rem] w-full rounded-[0.3rem] border border-[var(--atr-line)] bg-white px-[0.65rem] py-[0.45rem] text-[0.86rem] text-[var(--atr-text)]';

export default function DeploymentManageButton({ post }: { post: DeploymentPost }) {
  const { isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<'closed' | 'edit' | 'delete'>('closed');
  const [title, setTitle] = useState(post.title);
  const [date, setDate] = useState(post.date);
  const [description, setDescription] = useState(post.description);
  const [tags, setTags] = useState(post.tags.join(', '));
  const [publicContent, setPublicContent] = useState(post.content.trim());
  const [privateAction, setPrivateAction] = useState<'keep' | 'replace' | 'remove'>('keep');
  const [privateContent, setPrivateContent] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (!submitting) setMode('closed');
  }

  async function update() {
    if (!isAdmin) {
      setStatus('관리자 로그인 후에만 글을 수정할 수 있습니다.');
      return;
    }
    if (!title.trim() || !date.trim() || !publicContent.trim() || !token.trim()) {
      setStatus('제목, 날짜, 공개 본문, GitHub 토큰을 입력해 주세요.');
      return;
    }
    if (privateAction === 'replace' && (!privateContent.trim() || !password || password !== passwordConfirm || !masterKey)) {
      setStatus('보호 본문을 교체하려면 본문, 비밀번호 확인, 마스터키가 모두 필요합니다.');
      return;
    }
    if (privateAction === 'remove' && post.privatePath && !masterKey) {
      setStatus('보호 본문과 저장된 비밀번호를 함께 지우려면 마스터키가 필요합니다.');
      return;
    }
    setSubmitting(true);
    setStatus('수정 내용을 저장하고 있습니다.');
    try {
      const encryptedContent = privateAction === 'replace' ? await encryptTrpgLogContent(privateContent, password) : undefined;
      await commitDeploymentEditAtomically(token, {
        year: post.year, slug: post.slug, previousPrivatePath: post.privatePath, privateAction, encryptedContent,
        title: title.trim(), date: date.trim(), description: description.trim(),
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), publicContent,
      });
      const passwordKey = `deployments/${post.year}/${post.slug}/${post.slug}`;
      if (privateAction === 'replace') await saveTrpgPassword(token, masterKey, passwordKey, password);
      if (privateAction === 'remove' && post.privatePath) await saveTrpgPassword(token, masterKey, passwordKey);
      setStatus('수정했습니다. 저장소 배포가 완료되면 이 페이지에 반영됩니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.');
    } finally { setSubmitting(false); }
  }

  async function remove() {
    if (!isAdmin) {
      setStatus('관리자 로그인 후에만 글을 삭제할 수 있습니다.');
      return;
    }
    if (!token.trim()) { setStatus('GitHub 토큰을 입력해 주세요.'); return; }
    if (post.privatePath && !masterKey) { setStatus('보호 본문과 저장된 비밀번호를 함께 지우려면 마스터키가 필요합니다.'); return; }
    setSubmitting(true);
    setStatus('글을 삭제하고 있습니다.');
    try {
      await deleteDeploymentAtomically(token, { year: post.year, slug: post.slug, previousPrivatePath: post.privatePath });
      if (post.privatePath) await saveTrpgPassword(token, masterKey, `deployments/${post.year}/${post.slug}/${post.slug}`);
      setStatus('삭제했습니다. 저장소 배포가 완료되면 목록에서 사라집니다.');
    } catch (error) { setStatus(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.'); }
    finally { setSubmitting(false); }
  }

  if (loading || !isAdmin) return null;

  return <>
    <button type="button" onClick={() => setMode('edit')} className="rounded-[0.2rem] border border-[var(--atr-line)] px-[0.55rem] py-[0.28rem] text-[0.72rem] text-[var(--atr-muted)] hover:bg-white/60">관리</button>
    {mode !== 'closed' ? <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(76,51,61,0.38)] p-[1rem]" role="dialog" aria-modal="true" aria-label={mode === 'edit' ? '배포 글 수정' : '배포 글 삭제'}>
      <div className="ledger-paper-sheet mx-auto my-[2rem] max-w-[44rem] p-[1rem] md:p-[1.4rem]">
        <div className="flex items-start justify-between gap-[1rem] border-b border-[var(--atr-line)] pb-[0.8rem]"><div><p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.12em] text-[var(--atr-accent)]">Deployment management</p><h2 className="afterroll-title mt-[0.2rem] text-[1.8rem]">{mode === 'edit' ? '배포 글 수정' : '배포 글 삭제'}</h2></div><button type="button" onClick={close} className="text-[0.78rem] text-[var(--atr-muted)]">닫기</button></div>
        {mode === 'edit' ? <>
          <div className="mt-[0.8rem] grid gap-[0.75rem] md:grid-cols-2"><label className="text-[0.78rem] text-[var(--atr-muted)]">제목<input value={title} onChange={(event) => setTitle(event.target.value)} className={FIELD_CLASS} /></label><label className="text-[0.78rem] text-[var(--atr-muted)]">날짜<input value={date} onChange={(event) => setDate(event.target.value)} className={FIELD_CLASS} /></label></div>
          <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">한 줄 설명<input value={description} onChange={(event) => setDescription(event.target.value)} className={FIELD_CLASS} /></label><label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">태그 (쉼표로 구분)<input value={tags} onChange={(event) => setTags(event.target.value)} className={FIELD_CLASS} /></label><label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">공개 본문 (Markdown)<textarea value={publicContent} onChange={(event) => setPublicContent(event.target.value)} rows={8} className={FIELD_CLASS} /></label>
          {post.privatePath ? <fieldset className="mt-[0.75rem]"><legend className="text-[0.78rem] text-[var(--atr-muted)]">보호 본문</legend><div className="mt-[0.35rem] flex flex-wrap gap-[0.7rem] text-[0.78rem] text-[var(--atr-muted)]"><label><input type="radio" checked={privateAction === 'keep'} onChange={() => setPrivateAction('keep')} /> 유지</label><label><input type="radio" checked={privateAction === 'replace'} onChange={() => setPrivateAction('replace')} /> 교체</label><label><input type="radio" checked={privateAction === 'remove'} onChange={() => setPrivateAction('remove')} /> 삭제</label></div></fieldset> : <button type="button" onClick={() => setPrivateAction('replace')} className="mt-[0.75rem] text-[0.78rem] text-[var(--atr-accent)]">보호 본문 추가</button>}
          {privateAction === 'replace' ? <><label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">새 보호 본문 (Markdown)<textarea value={privateContent} onChange={(event) => setPrivateContent(event.target.value)} rows={6} className={FIELD_CLASS} /></label><div className="mt-[0.75rem] grid gap-[0.75rem] md:grid-cols-3"><label className="text-[0.78rem] text-[var(--atr-muted)]">글 비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={FIELD_CLASS} /></label><label className="text-[0.78rem] text-[var(--atr-muted)]">비밀번호 확인<input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} className={FIELD_CLASS} /></label><label className="text-[0.78rem] text-[var(--atr-muted)]">마스터키<input type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} className={FIELD_CLASS} /></label></div></> : null}
        </> : <p className="afterroll-body mt-[1rem] text-[0.9rem] text-[var(--atr-muted)]"><strong className="text-[var(--atr-text)]">{post.title}</strong> 글과 보호 본문 파일을 삭제합니다. 이 작업은 되돌리려면 저장소에서 다시 복구해야 합니다.</p>}
        {(mode === 'delete' && post.privatePath) || (mode === 'edit' && privateAction === 'remove') ? <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">마스터키<input type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} className={FIELD_CLASS} /></label> : null}
        <label className="mt-[0.75rem] block text-[0.78rem] text-[var(--atr-muted)]">GitHub access token<input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} className={FIELD_CLASS} /><span className="mt-[0.25rem] block text-[0.7rem]">토큰과 마스터키는 저장하지 않습니다.</span></label>
        {status ? <p className="mt-[0.8rem] text-[0.82rem] text-[var(--atr-muted)]" role="status">{status}</p> : null}<div className="mt-[1rem] flex justify-between gap-[0.5rem]"><button type="button" onClick={() => setMode(mode === 'edit' ? 'delete' : 'edit')} className="text-[0.78rem] text-[var(--atr-warn)]">{mode === 'edit' ? '이 글 삭제' : '수정으로 돌아가기'}</button><div className="flex gap-[0.5rem]"><button type="button" onClick={close} className="ledger-index-tab rounded-[0.25rem] px-[0.75rem] py-[0.45rem] text-[0.78rem]">취소</button><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={mode === 'edit' ? update : remove} disabled={submitting} className="ledger-stamp rounded-[0.25rem] px-[0.8rem] py-[0.45rem] text-[0.78rem] disabled:opacity-50">{submitting ? '처리 중' : mode === 'edit' ? '수정 저장' : '삭제'}</motion.button></div></div>
      </div>
    </div> : null}
  </>;
}
