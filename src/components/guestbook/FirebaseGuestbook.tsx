'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type GuestbookEntry = {
  id: string;
  name: string;
  message: string;
  timestamp?: Timestamp;
};

type GuestbookTheme = 'glass' | 'afterroll';

type FirebaseGuestbookProps = {
  collectionName?: string;
  placeholder?: string;
  emptyMessage?: string;
  theme?: GuestbookTheme;
  canDeleteWhenSignedIn?: boolean;
};

const THEME_STYLES = {
  glass: {
    formClassName: 'glass-card rounded-[1.25rem] backdrop-blur-[40px] p-6',
    formStyle: {
      background: 'rgba(0, 0, 0, 0.35)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    labelClassName: 'block text-[0.85rem] text-[var(--color-muted)] mb-2',
    inputClassName: 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[var(--color-accent)] transition-colors',
    textareaClassName: 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none',
    countClassName: 'text-[0.75rem] text-[var(--color-muted)] mt-2 text-right',
    buttonClassName: 'w-full px-8 py-3.5 rounded-xl bg-[var(--color-accent)]/25 border border-[var(--color-accent)]/50 text-[var(--color-accent)] font-medium hover:bg-[var(--color-accent)]/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all',
    listClassName: 'flex flex-col gap-4 px-4',
    entryClassName: 'glass-card rounded-2xl backdrop-blur-[40px] px-6 py-5',
    entryStyle: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    nameClassName: 'font-medium text-[var(--color-text)]',
    timeClassName: 'text-[0.75rem] text-white/60',
    messageClassName: 'text-[0.95rem] text-[var(--color-text)]/90 leading-relaxed whitespace-pre-wrap',
    deleteButtonClassName: 'text-[0.75rem] text-white/55 transition-colors hover:text-red-300',
    emptyClassName: 'glass-card rounded-[1rem] p-[3rem] text-center',
    emptyStyle: {
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    },
    emptyTextClassName: 'text-[var(--color-muted)]',
  },
  afterroll: {
    formClassName: 'rounded-[0.55rem] border border-[var(--atr-line)] bg-white/70 p-[1rem]',
    formStyle: {},
    labelClassName: 'block text-[0.82rem] font-bold text-[var(--atr-soft)] mb-[0.35rem]',
    inputClassName: 'w-full rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.75rem] py-[0.55rem] text-[0.9rem] text-[var(--atr-text)] outline-none placeholder:text-[var(--atr-soft)] focus:border-[var(--atr-line-strong)] transition-colors',
    textareaClassName: 'w-full rounded-[0.35rem] border border-[var(--atr-line)] bg-white px-[0.75rem] py-[0.65rem] text-[0.9rem] leading-[1.6] text-[var(--atr-text)] outline-none placeholder:text-[var(--atr-soft)] focus:border-[var(--atr-line-strong)] transition-colors resize-y',
    countClassName: 'mt-[0.35rem] text-right text-[0.72rem] text-[var(--atr-soft)]',
    buttonClassName: 'w-full rounded-[0.35rem] border border-[var(--atr-line-strong)] bg-[rgba(232,169,186,0.2)] px-[0.9rem] py-[0.55rem] text-[0.86rem] font-bold text-[var(--atr-accent)] transition-colors hover:bg-[rgba(232,169,186,0.3)] disabled:cursor-not-allowed disabled:opacity-50',
    listClassName: 'flex flex-col gap-[0.7rem]',
    entryClassName: 'rounded-[0.45rem] border border-[var(--atr-line)] bg-white/65 px-[1rem] py-[0.85rem]',
    entryStyle: {},
    nameClassName: 'font-bold text-[var(--atr-text)]',
    timeClassName: 'text-[0.72rem] text-[var(--atr-soft)]',
    messageClassName: 'text-[0.92rem] leading-[1.65] text-[var(--atr-muted)] whitespace-pre-wrap',
    deleteButtonClassName: 'text-[0.72rem] text-[var(--atr-soft)] transition-colors hover:text-[var(--atr-warn)]',
    emptyClassName: 'rounded-[0.45rem] border border-[var(--atr-line)] bg-white/55 p-[2rem] text-center',
    emptyStyle: {},
    emptyTextClassName: 'text-[var(--atr-muted)]',
  },
} as const;

export default function FirebaseGuestbook({
  collectionName = 'guestbook',
  placeholder = '방문해줘서 고마워요',
  emptyMessage = '첫 번째 방문자가 되어주세요',
  theme = 'glass',
  canDeleteWhenSignedIn = false,
}: FirebaseGuestbookProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const styles = THEME_STYLES[theme];
  const canDelete = canDeleteWhenSignedIn && !!user;

  const loadEntries = useCallback(async () => {
    try {
      const q = query(
        collection(db, collectionName),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GuestbookEntry[];
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }, [collectionName]);

  // 방명록 불러오기
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('메시지를 입력해주세요');
      return;
    }

    if (message.length > 500) {
      setError('메시지는 500자 이하로 작성해주세요');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, collectionName), {
        name: name.trim() || '익명',
        message: message.trim(),
        timestamp: serverTimestamp()
      });

      // 폼 초기화
      setName('');
      setMessage('');

      // 목록 새로고침
      await loadEntries();
    } catch (err) {
      console.error('Failed to submit:', err);
      setError('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!canDelete) return;
    if (!window.confirm('이 방명록을 삭제할까요?')) return;

    setDeletingId(entryId);
    setError('');

    try {
      await deleteDoc(doc(db, collectionName, entryId));
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('방명록 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 작성 폼 */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onSubmit={handleSubmit}
        className={styles.formClassName}
        style={styles.formStyle}
      >
        <div className="space-y-5">
          {/* 이름 입력 */}
          <div>
            <label htmlFor="name" className={styles.labelClassName}>
              이름 (선택)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="익명"
              maxLength={50}
              className={styles.inputClassName}
            />
          </div>

          {/* 메시지 입력 */}
          <div>
            <label htmlFor="message" className={styles.labelClassName}>
              메시지 *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              rows={4}
              className={styles.textareaClassName}
            />
            <p className={styles.countClassName}>
              {message.length} / 500
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[0.85rem] text-red-400"
            >
              {error}
            </motion.p>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.buttonClassName}
          >
            {isSubmitting ? '전송 중...' : '남기기'}
          </button>
        </div>
      </motion.form>

      {/* 방명록 목록 */}
      <div className={styles.listClassName}>
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={styles.entryClassName}
              style={styles.entryStyle}
            >
              {/* 헤더 */}
              <div className="flex flex-wrap items-baseline justify-between gap-[0.5rem] mb-3">
                <p className={styles.nameClassName}>
                  {entry.name}
                </p>
                <div className="flex items-center gap-[0.6rem]">
                  <time className={styles.timeClassName}>
                    {formatDate(entry.timestamp)}
                  </time>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className={styles.deleteButtonClassName}
                    >
                      {deletingId === entry.id ? '삭제 중...' : '삭제'}
                    </button>
                  )}
                </div>
              </div>

              {/* 메시지 */}
              <p className={styles.messageClassName}>
                {entry.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 빈 상태 */}
        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.emptyClassName}
            style={styles.emptyStyle}
          >
            <p className={styles.emptyTextClassName}>
              {emptyMessage}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
