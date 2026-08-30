'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character, CharacterLink, CharacterSticker } from '@/lib/data/characters';
import { characterStickerPaths, deleteCharacter, updateCharacter } from '@/lib/characterUpload';
import { savePrivateCharacterLinks, subscribeToPrivateCharacterLinks } from '@/lib/data/firebasePrivateCharacterLinks';
import { useAuth } from '@/contexts/AuthContext';
import CharacterSessionSelector from '@/components/characters/CharacterSessionSelector';

type EditableField = 'name' | 'alias' | 'catchphrase' | 'age' | 'gender' | 'heightWeight' | 'occupation' | 'species' | 'personality';
type Mode = 'edit' | 'delete' | null;

const FIELDS: Array<{ key: EditableField; label: string; multiline?: boolean }> = [
  { key: 'name', label: '이름' }, { key: 'alias', label: '별칭' }, { key: 'age', label: '나이' }, { key: 'gender', label: '성별' },
  { key: 'heightWeight', label: '키 / 몸무게' }, { key: 'occupation', label: '직업' }, { key: 'species', label: '종족' }, { key: 'catchphrase', label: '캐치프레이즈' }, { key: 'personality', label: '성격', multiline: true },
];

function valuesFrom(character: Character) {
  return Object.fromEntries(FIELDS.map(({ key }) => [key, character[key] ?? ''])) as Record<EditableField, string>;
}

export default function CharacterManagementActions({ character, onUpdated, onDeleted }: { character: Character; onUpdated: (character: Character) => void; onDeleted: () => void }) {
  const { isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [values, setValues] = useState(() => valuesFrom(character));
  const [links, setLinks] = useState<CharacterLink[]>(character.linkItems ?? []);
  const [privateLinks, setPrivateLinks] = useState<CharacterLink[]>([]);
  const [stickers, setStickers] = useState<CharacterSticker[]>(character.stickers ?? []);
  const [stickerFiles, setStickerFiles] = useState<File[]>([]);
  const [sessionKeys, setSessionKeys] = useState(character.sessionKeys);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToPrivateCharacterLinks(character.id, setPrivateLinks);
  }, [character.id, isAdmin]);
  if (loading || !isAdmin) return null;

  const resetAndClose = () => { setMode(null); setToken(''); setStatus(''); };
  const close = () => { if (!saving) resetAndClose(); };
  const open = (nextMode: Exclude<Mode, null>) => { setValues(valuesFrom(character)); setLinks(character.linkItems ?? []); setStickers(character.stickers ?? []); setStickerFiles([]); setSessionKeys(character.sessionKeys); setStatus(''); setMode(nextMode); };
  const save = async () => {
    if (!values.name.trim() || !token.trim()) return;
    setSaving(true); setStatus('수정 내용을 저장하는 중…');
    try {
      const newStickers = characterStickerPaths(character.id, stickerFiles);
      const nextCharacter: Character = { ...character, ...values, name: values.name.trim(), linkItems: links.filter((link) => link.name.trim() && link.url.trim()), stickers: [...stickers, ...newStickers], sessionKeys, updatedAt: new Date().toISOString() };
      await updateCharacter(token.trim(), nextCharacter, stickerFiles, newStickers);
      await savePrivateCharacterLinks(character.id, privateLinks);
      onUpdated(nextCharacter); resetAndClose();
    } catch (error) { setStatus(error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!token.trim()) return;
    setSaving(true); setStatus('캐릭터를 삭제하는 중…');
    try { await deleteCharacter(token.trim(), character); onDeleted(); resetAndClose(); }
    catch (error) { setStatus(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  return <><div className="absolute bottom-[0.7rem] right-[0.75rem] z-[5] flex gap-[0.4rem] opacity-100 transition-opacity duration-200 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100" onClick={(event) => event.stopPropagation()}>
    <button type="button" className="bg-transparent p-0 text-[0.68rem]" style={{ color: 'rgb(88 61 70)' }} onClick={() => open('edit')}>수정</button>
    <button type="button" className="bg-transparent p-0 text-[0.68rem] drop-shadow-[0_0.06rem_0.16rem_rgba(0,0,0,0.7)]" style={{ color: 'rgb(196 92 108)' }} onClick={() => open('delete')}>삭제</button>
  </div>{mode && createPortal(<div className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(76,51,61,0.38)] p-[0.7rem] backdrop-blur-[0.25rem]" onClick={close}>
    <section className="pc-composer max-h-[90vh] w-full max-w-[38rem] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-[var(--atr-line)] px-[1.1rem] py-[0.9rem]"><p className="afterroll-title text-[1.35rem] text-[var(--atr-text)]">{mode === 'edit' ? '캐릭터 수정' : '캐릭터 삭제'}</p><button type="button" className="afterroll-meta text-[0.8rem] text-[var(--atr-muted)]" onClick={close}>닫기</button></header>
      <div className="space-y-[0.8rem] px-[1.1rem] py-[1rem]">{mode === 'edit' ? <div className="grid gap-[0.65rem] sm:grid-cols-2">{FIELDS.map(({ key, label, multiline }) => <label key={key} className={multiline ? 'sm:col-span-2' : undefined}><span className="pc-field-label">{label}{key === 'name' ? ' *' : ''}</span>{multiline ? <textarea className="pc-field min-h-[5rem] resize-y" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /> : <input className="pc-field" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />}</label>)}</div> : <p className="afterroll-body text-[0.9rem] text-[var(--atr-muted)]">“{character.name}”을(를) 목록에서 삭제합니다. 이미지 파일은 보관소에 남고, 공개 목록에서만 제거됩니다.</p>}
        {mode === 'edit' && <section><div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]"><div><p className="pc-field-label mb-0">스티커</p><p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">상세 카드의 가장자리에 붙습니다.</p></div><label className="pc-link cursor-pointer">+ 스티커 추가<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" multiple className="sr-only" onChange={(event) => { setStickerFiles((current) => [...current, ...Array.from(event.target.files ?? [])]); event.currentTarget.value = ''; }} /></label></div>{(stickers.length > 0 || stickerFiles.length > 0) && <ul className="space-y-[0.35rem]" aria-label="스티커 목록">{stickers.map((sticker, index) => <li key={sticker.src} className="flex items-center justify-between gap-[0.75rem] border-b border-dashed border-[var(--atr-line)] pb-[0.35rem] afterroll-meta text-[0.72rem] text-[var(--atr-muted)]"><span>등록된 스티커 {index + 1}</span><button type="button" className="pc-link shrink-0" onClick={() => setStickers((current) => current.filter((_, itemIndex) => itemIndex !== index))}>제거</button></li>)}{stickerFiles.map((sticker, index) => <li key={`${sticker.name}-${index}`} className="flex items-center justify-between gap-[0.75rem] border-b border-dashed border-[var(--atr-line)] pb-[0.35rem] afterroll-meta text-[0.72rem] text-[var(--atr-muted)]"><span className="truncate">{sticker.name}</span><button type="button" className="pc-link shrink-0" onClick={() => setStickerFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>제거</button></li>)}</ul>}</section>}
        {mode === 'edit' && <><section>
          <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]"><p className="pc-field-label mb-0">링크</p><button type="button" className="pc-link" onClick={() => setLinks((current) => [...current, { name: '', url: '' }])}>+ 링크 추가</button></div>
          <div className="space-y-[0.5rem]">{links.map((link, index) => <div key={index} className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"><input className="pc-field" value={link.name} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="이름" aria-label={`링크 ${index + 1} 이름`} /><input className="pc-field" type="url" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://..." aria-label={`링크 ${index + 1} 주소`} /><button type="button" className="pc-link justify-self-end sm:self-center" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`링크 ${index + 1} 삭제`}>삭제</button></div>)}</div>
        </section><section>
          <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]"><div><p className="pc-field-label mb-0">비공개 링크</p><p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">관리자 로그인 시에만 표시됩니다.</p></div><button type="button" className="pc-link" onClick={() => setPrivateLinks((current) => [...current, { name: '', url: '' }])}>+ 링크 추가</button></div>
          <div className="space-y-[0.5rem]">{privateLinks.map((link, index) => <div key={index} className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"><input className="pc-field" value={link.name} onChange={(event) => setPrivateLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="이름" aria-label={`비공개 링크 ${index + 1} 이름`} /><input className="pc-field" type="url" value={link.url} onChange={(event) => setPrivateLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://..." aria-label={`비공개 링크 ${index + 1} 주소`} /><button type="button" className="pc-link justify-self-end sm:self-center" onClick={() => setPrivateLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`비공개 링크 ${index + 1} 삭제`}>삭제</button></div>)}</div>
        </section><CharacterSessionSelector value={sessionKeys} onChange={setSessionKeys} /></>}
        <label><span className="pc-field-label">GitHub access token</span><input className="pc-field" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder="fine-grained token (Contents: Read and write)" /></label>
        {status && <p className="afterroll-meta text-[0.72rem] text-[var(--atr-muted)]">{status}</p>}
        <div className="flex justify-end gap-[0.45rem]"><button type="button" className="pc-text-button" onClick={close}>취소</button><button type="button" className={mode === 'delete' ? 'pc-danger-button' : 'pc-primary-button'} disabled={saving || !token.trim() || (mode === 'edit' && !values.name.trim())} onClick={() => void (mode === 'edit' ? save() : remove())}>{saving ? '처리 중…' : mode === 'edit' ? '수정 저장' : '삭제'}</button></div>
      </div>
    </section>
  </div>, document.body)}</>;
}
