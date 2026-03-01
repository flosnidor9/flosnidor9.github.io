'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type GuestbookEntry = {
  id: string;
  name: string;
  message: string;
  timestamp: Timestamp;
};

export default function FirebaseGuestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 방명록 불러오기
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const q = query(
        collection(db, 'guestbook'),
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
  };

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
      await addDoc(collection(db, 'guestbook'), {
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

  const formatDate = (timestamp: Timestamp) => {
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
        className="glass-card rounded-[1.25rem] backdrop-blur-[40px] p-6"
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="space-y-5">
          {/* 이름 입력 */}
          <div>
            <label htmlFor="name" className="block text-[0.85rem] text-[var(--color-muted)] mb-2">
              이름 (선택)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="익명"
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* 메시지 입력 */}
          <div>
            <label htmlFor="message" className="block text-[0.85rem] text-[var(--color-muted)] mb-2">
              메시지 *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="방문해줘서 고마워요"
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
            />
            <p className="text-[0.75rem] text-[var(--color-muted)] mt-2 text-right">
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
            className="w-full px-8 py-3.5 rounded-xl bg-[var(--color-accent)]/25 border border-[var(--color-accent)]/50 text-[var(--color-accent)] font-medium hover:bg-[var(--color-accent)]/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? '전송 중...' : '남기기'}
          </button>
        </div>
      </motion.form>

      {/* 방명록 목록 */}
      <div className="flex flex-col gap-4 px-4">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="glass-card rounded-2xl backdrop-blur-[40px] px-6 py-5"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* 헤더 */}
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-medium text-[var(--color-text)]">
                  {entry.name}
                </p>
                <time className="text-[0.75rem] text-white/60">
                  {formatDate(entry.timestamp)}
                </time>
              </div>

              {/* 메시지 */}
              <p className="text-[0.95rem] text-[var(--color-text)]/90 leading-relaxed whitespace-pre-wrap">
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
            className="glass-card rounded-[1rem] p-[3rem] text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <p className="text-[var(--color-muted)]">
              첫 번째 방문자가 되어주세요 ✨
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
