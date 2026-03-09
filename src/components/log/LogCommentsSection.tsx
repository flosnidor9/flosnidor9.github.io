'use client';

import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  addLogComment,
  FirebaseLogComment,
  subscribeToLogComments,
} from '@/lib/data/firebaseComments';

type Props = {
  postSlug: string;
};

const MAX_AUTHOR_LENGTH = 24;
const MAX_CONTENT_LENGTH = 500;

function formatCommentDate(comment: FirebaseLogComment): string {
  if (!comment.createdAt) return '방금 전';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(comment.createdAt.toDate());
}

export default function LogCommentsSection({ postSlug }: Props) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<FirebaseLogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogComments(postSlug, (nextComments) => {
      setComments(nextComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postSlug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('댓글 내용을 입력해 주세요.');
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setError(`댓글은 ${MAX_CONTENT_LENGTH}자 이하로 작성해 주세요.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addLogComment(postSlug, { author, content: trimmedContent });
      setContent('');
    } catch (submitError) {
      console.error(submitError);
      setError('댓글 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-[3rem] border-t border-white/10 pt-[2rem]">
      <h2 className="font-serif text-[1.5rem] font-light text-white/90">Comments</h2>
      <p className="mt-[0.4rem] text-[0.9rem] text-white/50">로그인 없이 익명으로 댓글을 남길 수 있어요.</p>

      <form onSubmit={handleSubmit} className="mt-[1.5rem] space-y-[0.75rem]">
        <label className="block">
          <span className="mb-[0.4rem] block text-[0.82rem] text-white/60">이름 (선택)</span>
          <input
            type="text"
            value={author}
            maxLength={MAX_AUTHOR_LENGTH}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="익명"
            className="w-full rounded-[0.6rem] border border-white/15 bg-white/5 px-[0.9rem] py-[0.65rem] text-[0.92rem] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/35"
          />
        </label>

        <label className="block">
          <span className="mb-[0.4rem] block text-[0.82rem] text-white/60">댓글</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_CONTENT_LENGTH}
            rows={4}
            placeholder="이 글에 대한 감상이나 기록을 남겨주세요."
            className="w-full resize-y rounded-[0.6rem] border border-white/15 bg-white/5 px-[0.9rem] py-[0.75rem] text-[0.92rem] leading-relaxed text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/35"
          />
        </label>

        <div className="flex items-center justify-between gap-[1rem]">
          <p className="text-[0.8rem] text-white/45">{content.length} / {MAX_CONTENT_LENGTH}</p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-[0.6rem] border border-white/20 bg-white/10 px-[1rem] py-[0.55rem] text-[0.86rem] text-white/90 transition-all hover:border-white/35 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '등록 중...' : '댓글 남기기'}
          </button>
        </div>

        {error && <p className="text-[0.85rem] text-rose-300">{error}</p>}
      </form>

      <div className="mt-[1.75rem] space-y-[0.75rem]">
        {loading ? (
          <p className="text-[0.9rem] text-white/50">댓글을 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className="text-[0.9rem] text-white/50">첫 댓글을 남겨보세요.</p>
        ) : (
          comments.map((comment) => (
            <motion.article
              key={comment.id}
              className="rounded-[0.7rem] border border-white/10 bg-white/5 px-[1rem] py-[0.85rem]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mb-[0.35rem] flex items-center justify-between gap-[0.75rem]">
                <p className="text-[0.86rem] text-white/85">{comment.author}</p>
                <p className="text-[0.75rem] text-white/40">{formatCommentDate(comment)}</p>
              </div>
              <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed text-white/75">{comment.content}</p>
            </motion.article>
          ))
        )}
      </div>
    </section>
  );
}
