'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '@/lib/data/characters';
import { deleteCharacter, updateCharacter } from '@/lib/characterUpload';
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
  const [sessionKeys, setSessionKeys] = useState(character.sessionKeys);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  if (loading || !isAdmin) return null;

  const resetAndClose = () => { setMode(null); setToken(''); setStatus(''); };
  const close = () => { if (!saving) resetAndClose(); };
  const open = (nextMode: Exclude<Mode, null>) => { setValues(valuesFrom(character)); setSessionKeys(character.sessionKeys); setStatus(''); setMode(nextMode); };
  const save = async () => {
    if (!values.name.trim() || !token.trim()) return;
    setSaving(true); setStatus('수정 내용을 저장하는 중…');
    try {
      const nextCharacter: Character = { ...character, ...values, name: values.name.trim(), sessionKeys, updatedAt: new Date().toISOString() };
      await updateCharacter(token.trim(), nextCharacter);
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
        {mode === 'edit' && <CharacterSessionSelector value={sessionKeys} onChange={setSessionKeys} />}
        <label><span className="pc-field-label">GitHub access token</span><input className="pc-field" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder="fine-grained token (Contents: Read and write)" /></label>
        {status && <p className="afterroll-meta text-[0.72rem] text-[var(--atr-muted)]">{status}</p>}
        <div className="flex justify-end gap-[0.45rem]"><button type="button" className="pc-text-button" onClick={close}>취소</button><button type="button" className={mode === 'delete' ? 'pc-danger-button' : 'pc-primary-button'} disabled={saving || !token.trim() || (mode === 'edit' && !values.name.trim())} onClick={() => void (mode === 'edit' ? save() : remove())}>{saving ? '처리 중…' : mode === 'edit' ? '수정 저장' : '삭제'}</button></div>
      </div>
    </section>
  </div>, document.body)}</>;
}
